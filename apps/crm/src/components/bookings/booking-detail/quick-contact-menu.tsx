"use client";

import { Phone, Mail, MessageSquare, Copy, Check } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@tour/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickContactMenuProps {
  customerName: string;
  phone: string | null;
  email: string;
  className?: string;
  variant?: "icon" | "button";
}

/**
 * Quick Contact Menu
 *
 * A dropdown menu providing instant access to contact actions:
 * - Call (tap-to-call on mobile)
 * - Email (opens mail client)
 * - SMS (opens messaging on mobile)
 * - Copy contact info
 *
 * Mobile-first design: Actions use native tel:, mailto:, and sms: protocols
 * for seamless mobile integration.
 */
export function QuickContactMenu({
  customerName,
  phone,
  email,
  className,
  variant = "icon",
}: QuickContactMenuProps) {
  const [copied, setCopied] = useState<"phone" | "email" | null>(null);

  const handleCopy = async (value: string, type: "phone" | "email") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      toast.success(`${type === "phone" ? "Phone number" : "Email"} copied`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCall = () => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmail = () => {
    window.location.href = `mailto:${email}`;
  };

  const handleSMS = () => {
    if (phone) {
      window.location.href = `sms:${phone}`;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "relative group",
              className
            )}
            aria-label={`Contact ${customerName}`}
          >
            <Phone className="h-4 w-4 transition-transform group-hover:scale-110" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
          >
            <Phone className="h-4 w-4" />
            Contact
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-foreground">{customerName}</p>
          <p className="text-xs text-muted-foreground">Quick contact options</p>
        </div>
        <DropdownMenuSeparator />

        {/* Call Option */}
        {phone ? (
          <DropdownMenuItem onClick={handleCall} className="gap-3 cursor-pointer">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Call</p>
              <p className="text-xs text-muted-foreground">{phone}</p>
            </div>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="gap-3 opacity-50">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
              <Phone className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Call</p>
              <p className="text-xs text-muted-foreground">No phone number</p>
            </div>
          </DropdownMenuItem>
        )}

        {/* Email Option */}
        <DropdownMenuItem onClick={handleEmail} className="gap-3 cursor-pointer">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Email</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </DropdownMenuItem>

        {/* SMS Option */}
        {phone ? (
          <DropdownMenuItem onClick={handleSMS} className="gap-3 cursor-pointer">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50">
              <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">SMS</p>
              <p className="text-xs text-muted-foreground">Send text message</p>
            </div>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="gap-3 opacity-50">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">SMS</p>
              <p className="text-xs text-muted-foreground">No phone number</p>
            </div>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Copy Actions */}
        {phone && (
          <DropdownMenuItem
            onClick={() => handleCopy(phone, "phone")}
            className="gap-3 cursor-pointer"
          >
            {copied === "phone" ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">Copy phone number</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => handleCopy(email, "email")}
          className="gap-3 cursor-pointer"
        >
          {copied === "email" ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">Copy email address</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
