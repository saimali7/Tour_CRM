"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

export interface SelectContentProps {
  children: React.ReactNode;
}

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
} | null>(null);

export function Select({ value, onValueChange, children, disabled = false }: SelectProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, disabled }}>
      <div className={cn("relative", disabled && "opacity-50 cursor-not-allowed")}>{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className = "",
  children,
}: SelectTriggerProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");

  return (
    <button
      type="button"
      onClick={() => !context.disabled && context.setOpen(!context.open)}
      disabled={context.disabled}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "placeholder:text-muted-foreground",
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  return (
    <span className={cn(!context.value && "text-muted-foreground")}>
      {context.value || placeholder}
    </span>
  );
}

export function SelectContent({ children }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within Select");

  if (!context.open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => context.setOpen(false)}
      />
      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md">
        {children}
      </div>
    </>
  );
}

export function SelectItem({ value, children }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");

  const isSelected = context.value === value;

  return (
    <div
      onClick={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent/50 font-medium"
      )}
    >
      <span className="flex-1">{children}</span>
      {isSelected && <Check className="h-4 w-4 text-primary" />}
    </div>
  );
}
