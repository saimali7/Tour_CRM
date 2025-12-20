"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, HelpCircle, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Validation State Types
// ============================================================================

export interface FieldValidationState {
  error?: string;
  touched?: boolean;
  valid?: boolean;
  validating?: boolean;
}

// ============================================================================
// useFieldValidation Hook
// ============================================================================

/**
 * Hook for managing inline field validation state.
 * Validates on blur, then re-validates on change after first blur.
 */
export function useFieldValidation<T>(
  value: T,
  validate: (value: T) => string | undefined
) {
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const validateField = React.useCallback(() => {
    const validationError = validate(value);
    setError(validationError);
    return !validationError;
  }, [value, validate]);

  const handleBlur = React.useCallback(() => {
    setTouched(true);
    validateField();
  }, [validateField]);

  const handleChange = React.useCallback(() => {
    // Only re-validate on change if already touched (after first blur)
    if (touched) {
      validateField();
    }
  }, [touched, validateField]);

  const reset = React.useCallback(() => {
    setTouched(false);
    setError(undefined);
  }, []);

  // Derive valid state
  const valid = touched && !error && value !== undefined && value !== "";

  return {
    touched,
    error,
    valid,
    onBlur: handleBlur,
    onChange: handleChange,
    reset,
    validate: validateField,
    setTouched,
  };
}

// ============================================================================
// getInputValidationClasses Helper
// ============================================================================

/**
 * Returns Tailwind classes for input validation states.
 * Use with cn() to apply to input elements.
 *
 * @param state - Current validation state
 * @param options - Additional options for styling
 */
export function getInputValidationClasses(
  state: FieldValidationState,
  options?: { showSuccessState?: boolean; enableGlow?: boolean }
): string {
  const { error, touched, valid, validating } = state;
  const { showSuccessState = true, enableGlow = true } = options ?? {};

  if (validating) {
    return "border-primary/50 focus-visible:ring-primary/30";
  }

  if (touched && error) {
    const glowClass = enableGlow
      ? "shadow-[0_0_0_1px_hsl(var(--destructive)/0.2),0_0_8px_2px_hsl(var(--destructive)/0.1)]"
      : "";
    return cn("border-destructive focus-visible:ring-destructive/30", glowClass);
  }

  if (touched && valid && showSuccessState) {
    return "border-emerald-500 focus-visible:ring-emerald-500/30";
  }

  return "border-input";
}

/**
 * Returns shake animation class when field has error.
 * Use a key prop to trigger re-animation.
 */
export function getShakeClass(shouldShake: boolean): string {
  return shouldShake ? "animate-[shake_0.4s_ease-out]" : "";
}

// ============================================================================
// ValidatedFormField Component
// ============================================================================

interface ValidatedFormFieldProps {
  label: string;
  htmlFor?: string;
  helpText?: string;
  hint?: string;
  error?: string;
  touched?: boolean;
  valid?: boolean;
  validating?: boolean;
  required?: boolean;
  optional?: boolean;
  showValidState?: boolean;
  /** Custom success message (defaults to "Looks good") */
  successMessage?: string;
  /** Trigger shake animation when error appears */
  shouldShake?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Form field with inline validation feedback.
 * Shows error on blur, success checkmark when valid.
 *
 * Features:
 * - Animated error message slide-in
 * - Shake animation on new errors
 * - Loading indicator during validation
 * - Success checkmark when valid
 */
export function ValidatedFormField({
  label,
  htmlFor,
  helpText,
  hint,
  error,
  touched,
  valid,
  validating,
  required,
  optional,
  showValidState = true,
  successMessage = "Looks good",
  shouldShake,
  children,
  className,
}: ValidatedFormFieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const showError = touched && error;
  const showValid = showValidState && touched && valid && !error && !validating;
  const showValidating = validating;

  // Track shake animation
  const [shakeKey, setShakeKey] = React.useState(0);
  const prevErrorRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    // Trigger shake when error changes (not just appears)
    if (shouldShake && error && error !== prevErrorRef.current) {
      setShakeKey((k) => k + 1);
    }
    prevErrorRef.current = error;
  }, [error, shouldShake]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && (
            <span className="text-muted-foreground font-normal ml-2">(optional)</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          {showValidating && (
            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {helpText}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div
        key={shakeKey}
        className={cn(shakeKey > 0 && touched && error && "animate-[shake_0.4s_ease-out]")}
      >
        {children}
      </div>

      <div className="min-h-[20px]">
        {showError && (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {!showError && showValid && (
          <p className="text-xs text-emerald-600 flex items-center gap-1.5 animate-in fade-in duration-200">
            <Check className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{successMessage}</span>
          </p>
        )}
        {!showError && !showValid && !showValidating && hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        {showValidating && (
          <p className="text-xs text-muted-foreground animate-pulse">Validating...</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ValidatedTextareaField Component
// ============================================================================

interface ValidatedTextareaFieldProps extends ValidatedFormFieldProps {
  maxLength?: number;
  currentLength?: number;
}

/**
 * Form field with character counter for textareas.
 * Shows warning when approaching limit, error when exceeded.
 */
export function ValidatedTextareaField({
  label,
  htmlFor,
  helpText,
  hint,
  error,
  touched,
  valid,
  validating,
  required,
  optional,
  showValidState = false,
  shouldShake,
  children,
  className,
  maxLength,
  currentLength = 0,
}: ValidatedTextareaFieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const showError = touched && error;
  const isNearLimit = maxLength && currentLength > maxLength * 0.875;
  const isOverLimit = maxLength && currentLength > maxLength;

  // Track shake animation
  const [shakeKey, setShakeKey] = React.useState(0);
  const prevErrorRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (shouldShake && error && error !== prevErrorRef.current) {
      setShakeKey((k) => k + 1);
    }
    prevErrorRef.current = error;
  }, [error, shouldShake]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && (
            <span className="text-muted-foreground font-normal ml-2">(optional)</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          {validating && (
            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {helpText}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div
        key={shakeKey}
        className={cn(shakeKey > 0 && touched && error && "animate-[shake_0.4s_ease-out]")}
      >
        {children}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-h-[20px]">
          {showError ? (
            <p
              id={errorId}
              role="alert"
              className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </p>
          ) : hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {maxLength !== undefined && (
          <span
            className={cn(
              "text-xs tabular-nums transition-colors flex-shrink-0",
              isOverLimit
                ? "text-destructive font-medium"
                : isNearLimit
                  ? "text-amber-500"
                  : "text-muted-foreground"
            )}
          >
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Original FormField (backwards compatible)
// ============================================================================

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  helpText,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className={cn(
            "text-sm font-medium",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {helpText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// Inline help text version (shown below input)
interface FormFieldInlineProps extends FormFieldProps {
  description?: string;
}

export function FormFieldInline({
  label,
  htmlFor,
  helpText,
  description,
  error,
  required,
  children,
  className,
}: FormFieldInlineProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={htmlFor}
          className={cn(
            "text-sm font-medium",
            error ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {helpText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Form section for grouping related fields
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// Form card for visual grouping
interface FormCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormCard({
  title,
  description,
  children,
  className,
}: FormCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-6 space-y-6",
        className
      )}
    >
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// ValidatedInput Component
// ============================================================================

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text */
  label: string;
  /** Validation function - returns error message or undefined */
  validate?: (value: string) => string | undefined;
  /** Help text shown in tooltip */
  helpText?: string;
  /** Hint text shown below input */
  hint?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is optional */
  optional?: boolean;
  /** Show success state when valid */
  showValidState?: boolean;
  /** Success message (defaults to "Looks good") */
  successMessage?: string;
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
  /** Icon to show on the left side */
  leftIcon?: React.ReactNode;
  /** External error (e.g., from server) */
  externalError?: string;
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean) => void;
  /** Container className */
  containerClassName?: string;
}

/**
 * Complete validated input with built-in validation state management.
 *
 * Features:
 * - Real-time debounced validation after first blur
 * - Shake animation on error
 * - Error glow effect
 * - Success checkmark when valid
 * - Optional left icon
 *
 * @example
 * ```tsx
 * <ValidatedInput
 *   label="Email"
 *   name="email"
 *   type="email"
 *   required
 *   validate={(value) => {
 *     if (!value) return "Email is required";
 *     if (!value.includes("@")) return "Invalid email format";
 *     return undefined;
 *   }}
 *   placeholder="you@example.com"
 *   helpText="We'll never share your email"
 * />
 * ```
 */
export function ValidatedInput({
  label,
  validate,
  helpText,
  hint,
  required,
  optional,
  showValidState = true,
  successMessage = "Looks good",
  debounceMs = 300,
  leftIcon,
  externalError,
  onValidationChange,
  containerClassName,
  className,
  value,
  onChange,
  onBlur,
  id,
  ...inputProps
}: ValidatedInputProps) {
  const generatedId = React.useId();
  const inputId = id || `input-${generatedId}`;
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [validating, setValidating] = React.useState(false);
  const [shakeKey, setShakeKey] = React.useState(0);

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const prevErrorRef = React.useRef<string | undefined>(undefined);
  const currentValue = typeof value === "string" ? value : "";

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle external error
  React.useEffect(() => {
    if (externalError) {
      setTouched(true);
      setError(externalError);
    }
  }, [externalError]);

  // Validate the current value
  const validateValue = React.useCallback(
    (val: string): string | undefined => {
      if (!validate) return undefined;
      return validate(val);
    },
    [validate]
  );

  // Trigger validation
  const runValidation = React.useCallback(
    (val: string) => {
      const validationError = validateValue(val);

      if (validationError && validationError !== prevErrorRef.current) {
        setShakeKey((k) => k + 1);
      }

      prevErrorRef.current = validationError;
      setError(validationError);
      setValidating(false);

      if (onValidationChange) {
        onValidationChange(!validationError);
      }
    },
    [validateValue, onValidationChange]
  );

  // Handle blur - always validate
  const handleBlur = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      runValidation(e.target.value);
      onBlur?.(e);
    },
    [runValidation, onBlur]
  );

  // Handle change - debounced re-validation if touched
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (touched && validate) {
        setValidating(true);
        debounceTimerRef.current = setTimeout(() => {
          runValidation(e.target.value);
        }, debounceMs);
      }
    },
    [onChange, touched, validate, debounceMs, runValidation]
  );

  // Compute validation states
  const showError = touched && error;
  const isValid = touched && !error && currentValue.length > 0;
  const showValid = showValidState && isValid && !validating;

  // Compute input classes
  const inputClasses = React.useMemo(() => {
    if (validating) {
      return "border-primary/50 focus-visible:ring-primary/30";
    }
    if (showError) {
      return "border-destructive focus-visible:ring-destructive/30 shadow-[0_0_0_1px_hsl(var(--destructive)/0.2),0_0_8px_2px_hsl(var(--destructive)/0.1)]";
    }
    if (showValid) {
      return "border-emerald-500 focus-visible:ring-emerald-500/30";
    }
    return "border-input";
  }, [validating, showError, showValid]);

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && (
            <span className="text-muted-foreground font-normal ml-2">(optional)</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          {validating && (
            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {helpText}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div
        key={shakeKey}
        className={cn(shakeKey > 0 && showError && "animate-[shake_0.4s_ease-out]")}
      >
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={showError ? "true" : undefined}
            aria-describedby={showError ? `${inputId}-error` : undefined}
            className={cn(
              "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
              "ring-offset-background transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
              leftIcon && "pl-10",
              inputClasses,
              className
            )}
            {...inputProps}
          />
          {showValid && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[20px]">
        {showError && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {!showError && showValid && (
          <p className="text-xs text-emerald-600 flex items-center gap-1.5 animate-in fade-in duration-200">
            <Check className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{successMessage}</span>
          </p>
        )}
        {!showError && !showValid && !validating && hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        {validating && (
          <p className="text-xs text-muted-foreground animate-pulse">Validating...</p>
        )}
      </div>
    </div>
  );
}
