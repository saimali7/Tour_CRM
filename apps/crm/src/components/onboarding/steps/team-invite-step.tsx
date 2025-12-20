"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Plus,
  X,
  ArrowRight,
  Loader2,
  UserPlus,
  Shield,
  Briefcase,
  Headphones,
  Map,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface TeamInviteStepProps {
  onComplete: () => void;
  onSkipStep: () => void;
}

interface TeamInvite {
  id: string;
  email: string;
  role: "admin" | "manager" | "support" | "guide";
}

// =============================================================================
// CONSTANTS
// =============================================================================

const roleOptions = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access to all features",
    icon: Shield,
  },
  {
    value: "manager",
    label: "Manager",
    description: "Manage bookings and schedules",
    icon: Briefcase,
  },
  {
    value: "support",
    label: "Support",
    description: "Handle customer inquiries",
    icon: Headphones,
  },
  {
    value: "guide",
    label: "Guide",
    description: "View assigned tours only",
    icon: Map,
  },
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamInviteStep({
  onComplete,
  onSkipStep,
}: TeamInviteStepProps) {
  const [invites, setInvites] = useState<TeamInvite[]>([
    { id: crypto.randomUUID(), email: "", role: "support" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentInvites, setSentInvites] = useState<string[]>([]);

  const inviteMember = trpc.team.invite.useMutation();

  // Add a new invite row
  const addInvite = () => {
    if (invites.length < 5) {
      setInvites([
        ...invites,
        { id: crypto.randomUUID(), email: "", role: "support" },
      ]);
    }
  };

  // Remove an invite row
  const removeInvite = (id: string) => {
    if (invites.length > 1) {
      setInvites(invites.filter((inv) => inv.id !== id));
      // Clear any errors for this invite
      const newErrors = { ...errors };
      delete newErrors[id];
      setErrors(newErrors);
    }
  };

  // Update an invite
  const updateInvite = (
    id: string,
    field: keyof Omit<TeamInvite, "id">,
    value: string
  ) => {
    setInvites(
      invites.map((inv) => (inv.id === id ? { ...inv, [field]: value } : inv))
    );

    // Clear error when user starts typing
    if (errors[id]) {
      const newErrors = { ...errors };
      delete newErrors[id];
      setErrors(newErrors);
    }
  };

  // Validate email
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty invites
    const validInvites = invites.filter((inv) => inv.email.trim() !== "");

    // If no valid invites, just proceed
    if (validInvites.length === 0) {
      onComplete();
      return;
    }

    // Validate all invites
    const newErrors: Record<string, string> = {};
    validInvites.forEach((inv) => {
      if (!validateEmail(inv.email)) {
        newErrors[inv.id] = "Please enter a valid email address";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Send all invites
      for (const invite of validInvites) {
        try {
          await inviteMember.mutateAsync({
            email: invite.email,
            role: invite.role,
          });
          setSentInvites((prev) => [...prev, invite.id]);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to send invite";

          // Check for specific errors
          if (errorMessage.includes("already a member")) {
            newErrors[invite.id] = "Already a team member";
          } else {
            newErrors[invite.id] = "Failed to send invite";
          }
        }
      }

      // Show appropriate message
      const successCount = validInvites.length - Object.keys(newErrors).length;
      if (successCount > 0) {
        toast.success(
          `${successCount} invite${successCount > 1 ? "s" : ""} sent successfully`
        );
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      } else {
        onComplete();
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if any invites have emails
  const hasAnyEmail = invites.some((inv) => inv.email.trim() !== "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 mb-4">
          <Users className="h-8 w-8 text-blue-500" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Invite your team members to help manage tours and bookings. They'll
          receive an email with instructions to join.
        </p>
      </div>

      {/* Invite list */}
      <div className="space-y-3">
        {invites.map((invite, index) => {
          const isSent = sentInvites.includes(invite.id);

          return (
            <div
              key={invite.id}
              className={cn(
                "relative rounded-xl border p-4 transition-all",
                isSent
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : errors[invite.id]
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-border bg-card/50"
              )}
            >
              {/* Remove button */}
              {invites.length > 1 && !isSent && (
                <button
                  type="button"
                  onClick={() => removeInvite(invite.id)}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              <div className="space-y-3">
                {/* Email input */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={invite.email}
                    onChange={(e) =>
                      updateInvite(invite.id, "email", e.target.value)
                    }
                    placeholder="colleague@company.com"
                    className="pl-10"
                    disabled={isSent}
                    error={!!errors[invite.id]}
                  />
                </div>

                {/* Role select */}
                {isSent ? (
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {roleOptions.find((r) => r.value === invite.role)?.label}
                  </div>
                ) : (
                  <Select
                    value={invite.role}
                    onValueChange={(value) =>
                      updateInvite(
                        invite.id,
                        "role",
                        value as TeamInvite["role"]
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => {
                        const Icon = role.icon;
                        return (
                          <SelectItem
                            key={role.value}
                            value={role.value}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span>{role.label}</span>
                              <span className="text-xs text-muted-foreground">
                                - {role.description}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}

                {/* Error message */}
                {errors[invite.id] && (
                  <p className="text-xs text-destructive">
                    {errors[invite.id]}
                  </p>
                )}

                {/* Success indicator */}
                {isSent && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Invite sent
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Add another button */}
        {invites.length < 5 && (
          <button
            type="button"
            onClick={addInvite}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3",
              "rounded-xl border border-dashed border-border",
              "text-sm text-muted-foreground",
              "hover:border-primary/50 hover:text-foreground hover:bg-muted/50",
              "transition-all"
            )}
          >
            <Plus className="h-4 w-4" />
            Add Another Member
          </button>
        )}
      </div>

      {/* Role guide */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Tip:</strong> Start
          with Support or Guide roles for team members who need limited access.
          You can always change roles later in Settings.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onSkipStep}
          className="flex-1"
          disabled={isSubmitting}
        >
          Skip for Now
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : hasAnyEmail ? (
            <>
              <UserPlus className="h-4 w-4" />
              Send Invites
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
