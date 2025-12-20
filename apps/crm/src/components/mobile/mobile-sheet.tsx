'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface MobileSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Called when the sheet should close */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Title displayed in the header */
  title?: string;
  /** Description text below the title */
  description?: string;
  /** Whether to show the close button (default: true) */
  showClose?: boolean;
  /** Whether to show the drag handle (default: true) */
  showHandle?: boolean;
  /** Height preset: 'auto' | 'half' | 'full' (default: 'auto') */
  height?: 'auto' | 'half' | 'full';
  /** Whether clicking the backdrop closes the sheet (default: true) */
  closeOnBackdrop?: boolean;
  /** Additional class names for the sheet container */
  className?: string;
}

/**
 * Mobile-optimized bottom sheet component
 * - Swipe down to dismiss
 * - Backdrop click to close
 * - Safe area handling for notched devices
 * - Smooth spring animations
 *
 * @example
 * <MobileSheet
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Filter Options"
 * >
 *   <FilterContent />
 * </MobileSheet>
 */
export function MobileSheet({
  open,
  onClose,
  children,
  title,
  description,
  showClose = true,
  showHandle = true,
  height = 'auto',
  closeOnBackdrop = true,
  className,
}: MobileSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      setIsClosing(false);
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragOffset(0);
    }, 200);
  }, [onClose]);

  // Handle swipe to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startY.current = touch.clientY;
    currentY.current = touch.clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    currentY.current = touch.clientY;
    const delta = currentY.current - startY.current;

    // Only allow dragging down
    if (delta > 0) {
      setDragOffset(delta);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    // If dragged more than 100px, close the sheet
    if (dragOffset > 100) {
      handleClose();
    } else {
      setDragOffset(0);
    }
  }, [dragOffset, handleClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) {
      handleClose();
    }
  }, [closeOnBackdrop, handleClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  if (!mounted) return null;

  const heightClasses = {
    auto: 'max-h-[90vh]',
    half: 'h-[50vh]',
    full: 'h-[calc(100vh-3rem)]',
  };

  const content = (
    <div
      className={cn(
        'fixed inset-0 z-50',
        open && !isClosing ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'mobile-sheet-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
          open && !isClosing ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl overflow-hidden',
          'transition-transform duration-200 ease-out',
          'safe-area-pb',
          heightClasses[height],
          open && !isClosing ? 'translate-y-0' : 'translate-y-full',
          className
        )}
        style={{
          transform:
            dragOffset > 0
              ? `translateY(${dragOffset}px)`
              : undefined,
          transition: dragOffset > 0 ? 'none' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between px-4 pb-3 border-b border-border">
            <div className="flex-1 min-w-0">
              {title && (
                <h2
                  id="mobile-sheet-title"
                  className="text-lg font-semibold text-foreground"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <button
                onClick={handleClose}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors touch-target"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );

  // Render in portal
  return createPortal(content, document.body);
}

/**
 * Simple action sheet for quick selections
 */
interface ActionSheetOption {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
  showCancel?: boolean;
  cancelLabel?: string;
}

export function ActionSheet({
  open,
  onClose,
  title,
  options,
  showCancel = true,
  cancelLabel = 'Cancel',
}: ActionSheetProps) {
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={title}
      showHandle={true}
      showClose={false}
    >
      <div className="p-2 space-y-1">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => {
              option.onClick();
              onClose();
            }}
            disabled={option.disabled}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left',
              'transition-colors touch-target',
              option.disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-muted active:bg-accent',
              option.destructive
                ? 'text-destructive'
                : 'text-foreground'
            )}
          >
            {option.icon && (
              <span className={option.destructive ? 'text-destructive' : 'text-muted-foreground'}>
                {option.icon}
              </span>
            )}
            <span className="text-base font-medium">{option.label}</span>
          </button>
        ))}

        {showCancel && (
          <>
            <div className="h-px bg-border my-2" />
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-base font-medium text-muted-foreground hover:bg-muted active:bg-accent transition-colors touch-target"
            >
              {cancelLabel}
            </button>
          </>
        )}
      </div>
    </MobileSheet>
  );
}

/**
 * Confirmation dialog styled for mobile
 */
interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}: ConfirmSheetProps) {
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      showHandle={true}
      showClose={false}
    >
      <div className="p-4 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={loading}
            className={cn(
              'w-full h-12 rounded-xl text-base font-medium transition-colors touch-target',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {loading ? 'Loading...' : confirmLabel}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-medium text-muted-foreground hover:bg-muted active:bg-accent transition-colors touch-target disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </MobileSheet>
  );
}
