"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ZodSchema, ZodError } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface FieldValidationState {
  /** Error message if validation failed */
  error?: string;
  /** Whether the field has been touched (blurred at least once) */
  touched: boolean;
  /** Whether the field is currently valid (touched + no error + has value) */
  valid: boolean;
  /** Whether the field is currently being validated (during debounce) */
  validating: boolean;
  /** Whether the field has been modified from its initial value */
  dirty: boolean;
}

export interface UseFieldValidationOptions<T> {
  /** Validation function - returns error message or undefined */
  validate: (value: T) => string | undefined;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Whether to validate on change (after first blur) */
  validateOnChange?: boolean;
  /** Whether to show success state when valid */
  showSuccess?: boolean;
}

export interface UseFieldValidationReturn<T> {
  /** Current validation state */
  state: FieldValidationState;
  /** Call on input blur */
  onBlur: () => void;
  /** Call on input change with current value */
  onChange: (value: T) => void;
  /** Manually trigger validation */
  validate: () => boolean;
  /** Reset validation state */
  reset: () => void;
  /** Set touched state manually */
  setTouched: (touched: boolean) => void;
  /** Whether to show shake animation */
  shouldShake: boolean;
  /** CSS classes for input styling */
  inputClasses: string;
}

// ============================================================================
// useFieldValidation Hook
// ============================================================================

/**
 * Hook for managing inline field validation with debounced re-validation.
 *
 * Features:
 * - Validates on blur, then re-validates on change (debounced)
 * - Tracks touched, dirty, validating states
 * - Provides shake animation trigger on error
 * - Returns CSS classes for styling
 *
 * @example
 * ```tsx
 * const nameValidation = useFieldValidation(formState.name, {
 *   validate: (value) => value.length < 3 ? "Name too short" : undefined,
 *   debounceMs: 300,
 * });
 *
 * <input
 *   value={formState.name}
 *   onChange={(e) => {
 *     setName(e.target.value);
 *     nameValidation.onChange(e.target.value);
 *   }}
 *   onBlur={nameValidation.onBlur}
 *   className={cn("base-classes", nameValidation.inputClasses)}
 * />
 * {nameValidation.state.error && (
 *   <span className="text-destructive">{nameValidation.state.error}</span>
 * )}
 * ```
 */
export function useFieldValidation<T>(
  value: T,
  options: UseFieldValidationOptions<T>
): UseFieldValidationReturn<T> {
  const {
    validate,
    debounceMs = 300,
    validateOnChange = true,
    showSuccess = true,
  } = options;

  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [validating, setValidating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const initialValueRef = useRef(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevErrorRef = useRef<string | undefined>(undefined);

  // Track if value differs from initial
  useEffect(() => {
    setDirty(value !== initialValueRef.current);
  }, [value]);

  // Determine if field is valid
  const valid = useMemo(() => {
    if (!touched || error) return false;
    // Check for non-empty value
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }, [touched, error, value]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Validate the field
  const validateField = useCallback((): boolean => {
    const validationError = validate(value);

    // Trigger shake if error is new or changed
    if (validationError && validationError !== prevErrorRef.current) {
      setShakeKey((k) => k + 1);
    }

    prevErrorRef.current = validationError;
    setError(validationError);
    setValidating(false);

    return !validationError;
  }, [value, validate]);

  // Handle blur - always validate
  const handleBlur = useCallback(() => {
    setTouched(true);
    validateField();
  }, [validateField]);

  // Handle change - debounced re-validation if already touched
  const handleChange = useCallback(
    (newValue: T) => {
      // Clear any pending validation
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Only re-validate if already touched
      if (touched && validateOnChange) {
        setValidating(true);

        debounceTimerRef.current = setTimeout(() => {
          // Re-validate with the new value
          const validationError = validate(newValue);

          if (validationError && validationError !== prevErrorRef.current) {
            setShakeKey((k) => k + 1);
          }

          prevErrorRef.current = validationError;
          setError(validationError);
          setValidating(false);
        }, debounceMs);
      }
    },
    [touched, validateOnChange, debounceMs, validate]
  );

  // Reset validation state
  const reset = useCallback(() => {
    setTouched(false);
    setError(undefined);
    setValidating(false);
    setDirty(false);
    prevErrorRef.current = undefined;
    initialValueRef.current = value;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [value]);

  // Generate input classes based on state
  const inputClasses = useMemo(() => {
    if (touched && error) {
      return "border-destructive focus-visible:ring-destructive/30 animate-[error-glow-pulse_2s_ease-in-out_infinite]";
    }
    if (touched && valid && showSuccess) {
      return "border-emerald-500 focus-visible:ring-emerald-500/30";
    }
    return "border-input";
  }, [touched, error, valid, showSuccess]);

  // Determine if should show shake animation
  const shouldShake = shakeKey > 0 && touched && !!error;

  return {
    state: {
      error,
      touched,
      valid,
      validating,
      dirty,
    },
    onBlur: handleBlur,
    onChange: handleChange,
    validate: validateField,
    reset,
    setTouched,
    shouldShake,
    inputClasses,
  };
}

// ============================================================================
// useFormValidation Hook (Multi-field)
// ============================================================================

export interface FieldConfig<T> {
  /** Field name */
  name: string;
  /** Initial value */
  initialValue: T;
  /** Validation function */
  validate: (value: T) => string | undefined;
  /** Whether field is required */
  required?: boolean;
}

export interface FormValidationState {
  /** Whether all required fields are valid */
  isValid: boolean;
  /** Whether any field has been touched */
  isTouched: boolean;
  /** Whether any field is dirty */
  isDirty: boolean;
  /** List of field names with errors */
  fieldsWithErrors: string[];
  /** List of missing required fields */
  missingFields: string[];
}

/**
 * Hook for managing multiple field validations.
 * Useful for form-level validation state aggregation.
 */
export function useFormValidation<T extends Record<string, unknown>>(
  values: T,
  fieldConfigs: Record<keyof T, { validate: (value: unknown) => string | undefined; required?: boolean }>
) {
  const [fieldStates, setFieldStates] = useState<Record<keyof T, FieldValidationState>>(() => {
    const initial = {} as Record<keyof T, FieldValidationState>;
    for (const key of Object.keys(fieldConfigs) as Array<keyof T>) {
      initial[key] = {
        error: undefined,
        touched: false,
        valid: false,
        validating: false,
        dirty: false,
      };
    }
    return initial;
  });

  // Validate a single field
  const validateField = useCallback(
    (fieldName: keyof T): boolean => {
      const config = fieldConfigs[fieldName];
      const value = values[fieldName];
      const error = config.validate(value);

      setFieldStates((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          error,
          valid: !error && value !== undefined && value !== "" && value !== null,
        },
      }));

      return !error;
    },
    [values, fieldConfigs]
  );

  // Handle blur for a field
  const handleBlur = useCallback(
    (fieldName: keyof T) => {
      setFieldStates((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          touched: true,
        },
      }));
      validateField(fieldName);
    },
    [validateField]
  );

  // Handle change for a field
  const handleChange = useCallback(
    (fieldName: keyof T) => {
      const state = fieldStates[fieldName];
      if (state?.touched) {
        validateField(fieldName);
      }
    },
    [fieldStates, validateField]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let allValid = true;
    const newStates = { ...fieldStates };

    for (const key of Object.keys(fieldConfigs) as Array<keyof T>) {
      const config = fieldConfigs[key];
      const value = values[key];
      const error = config.validate(value);

      newStates[key] = {
        ...newStates[key],
        touched: true,
        error,
        valid: !error && value !== undefined && value !== "" && value !== null,
      };

      if (error) {
        allValid = false;
      }
    }

    setFieldStates(newStates);
    return allValid;
  }, [values, fieldConfigs, fieldStates]);

  // Reset all fields
  const resetAll = useCallback(() => {
    const reset = {} as Record<keyof T, FieldValidationState>;
    for (const key of Object.keys(fieldConfigs) as Array<keyof T>) {
      reset[key] = {
        error: undefined,
        touched: false,
        valid: false,
        validating: false,
        dirty: false,
      };
    }
    setFieldStates(reset);
  }, [fieldConfigs]);

  // Compute form-level state
  const formState = useMemo((): FormValidationState => {
    const fieldsWithErrors: string[] = [];
    const missingFields: string[] = [];
    let isTouched = false;
    let isDirty = false;

    for (const key of Object.keys(fieldConfigs) as Array<keyof T>) {
      const state = fieldStates[key];
      const config = fieldConfigs[key];

      if (state?.touched) isTouched = true;
      if (state?.dirty) isDirty = true;
      if (state?.error) fieldsWithErrors.push(String(key));

      if (config.required) {
        const value = values[key];
        if (value === undefined || value === null || value === "") {
          missingFields.push(String(key));
        }
      }
    }

    return {
      isValid: fieldsWithErrors.length === 0 && missingFields.length === 0,
      isTouched,
      isDirty,
      fieldsWithErrors,
      missingFields,
    };
  }, [fieldStates, fieldConfigs, values]);

  // Get state for a specific field
  const getFieldState = useCallback(
    (fieldName: keyof T) => fieldStates[fieldName],
    [fieldStates]
  );

  // Get props to spread on an input
  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      onBlur: () => handleBlur(fieldName),
      onChange: () => handleChange(fieldName),
      "aria-invalid": fieldStates[fieldName]?.touched && !!fieldStates[fieldName]?.error,
      "aria-describedby": fieldStates[fieldName]?.error ? `${String(fieldName)}-error` : undefined,
    }),
    [handleBlur, handleChange, fieldStates]
  );

  return {
    fieldStates,
    formState,
    validateField,
    validateAll,
    handleBlur,
    handleChange,
    resetAll,
    getFieldState,
    getFieldProps,
  };
}

// ============================================================================
// useZodFieldValidation Hook
// ============================================================================

/**
 * Hook that creates a validation function from a Zod schema.
 * Useful when you want to validate a single field against a Zod schema.
 */
export function useZodFieldValidation<T>(
  value: T,
  schema: ZodSchema<T>,
  options?: Omit<UseFieldValidationOptions<T>, "validate">
) {
  const validate = useCallback(
    (val: T): string | undefined => {
      try {
        schema.parse(val);
        return undefined;
      } catch (err) {
        const zodError = err as ZodError;
        return zodError.errors[0]?.message;
      }
    },
    [schema]
  );

  return useFieldValidation(value, {
    ...options,
    validate,
  });
}
