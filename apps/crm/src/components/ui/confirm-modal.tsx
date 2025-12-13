"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  isLoading = false,
}: ConfirmModalProps) {
  const [isPending, setIsPending] = React.useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  const loading = isLoading || isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || " "}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-red-600 text-white hover:bg-red-700"
                : ""
            }
          >
            {loading ? "Loading..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using confirm modal imperatively
interface UseConfirmModalOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

export function useConfirmModal() {
  const [state, setState] = React.useState<{
    open: boolean;
    options: UseConfirmModalOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { title: "" },
    resolve: null,
  });

  const confirm = React.useCallback(
    (options: UseConfirmModalOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          options,
          resolve,
        });
      });
    },
    []
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((s) => {
      if (!open && s.resolve) {
        s.resolve(false);
      }
      return { ...s, open };
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    setState((s) => {
      if (s.resolve) {
        s.resolve(true);
      }
      return { ...s, open: false };
    });
  }, []);

  const ConfirmModalComponent = React.useMemo(
    () => (
      <ConfirmModal
        open={state.open}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        {...state.options}
      />
    ),
    [state.open, state.options, handleOpenChange, handleConfirm]
  );

  return { confirm, ConfirmModal: ConfirmModalComponent };
}
