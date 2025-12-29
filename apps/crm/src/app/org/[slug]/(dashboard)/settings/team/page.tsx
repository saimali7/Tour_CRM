"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  UserPlus,
  Loader2,
  Shield,
  Trash2,
  X,
  Users,
  Mail,
  Crown,
  UserCog,
  Headphones,
  Compass,
  MoreHorizontal,
} from "lucide-react";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import { cn } from "@/lib/utils";

const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    iconColor: "text-amber-500",
    description: "Full access including billing and deletion",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    iconColor: "text-blue-500",
    description: "Full access except billing and org deletion",
  },
  manager: {
    label: "Manager",
    icon: UserCog,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    iconColor: "text-emerald-500",
    description: "Manage bookings, schedules, and guides",
  },
  support: {
    label: "Support",
    icon: Headphones,
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    iconColor: "text-violet-500",
    description: "View and update bookings and customers",
  },
  guide: {
    label: "Guide",
    icon: Compass,
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    iconColor: "text-rose-500",
    description: "View assigned schedules and bookings only",
  },
};

export default function TeamSettingsPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "support" as "admin" | "manager" | "support" | "guide",
  });
  const [inviteError, setInviteError] = useState("");

  const { confirm, ConfirmModal } = useConfirmModal();
  const utils = trpc.useUtils();

  const { data: teamMembers, isLoading } = trpc.team.list.useQuery();

  const inviteMemberMutation = trpc.team.invite.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setShowInviteModal(false);
      setInviteForm({ email: "", firstName: "", lastName: "", role: "support" });
      setInviteError("");
    },
    onError: (error) => setInviteError(error.message),
  });

  const updateRoleMutation = trpc.team.updateRole.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
    onError: (error) => toast.error(error.message || "Failed to update role"),
  });

  const removeMemberMutation = trpc.team.remove.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
    onError: (error) => toast.error(error.message || "Failed to remove member"),
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team members and their access levels
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Team Members Card */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Team Members</h3>
              <p className="text-xs text-muted-foreground">
                {teamMembers?.length || 0} member{teamMembers?.length !== 1 ? "s" : ""} in your organization
              </p>
            </div>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading team...</p>
            </div>
          ) : teamMembers && teamMembers.length > 0 ? (
            <div className="divide-y divide-border/50">
              {teamMembers.map((member, index) => {
                const roleConfig = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.support;
                const RoleIcon = roleConfig.icon;

                return (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30",
                      index === 0 && "pt-5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center ring-2 ring-background shadow-sm">
                          {member.user.avatarUrl ? (
                            <img
                              src={member.user.avatarUrl}
                              alt=""
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary font-semibold text-sm">
                              {(member.user.firstName?.[0] || member.user.email[0] || "?").toUpperCase()}
                            </span>
                          )}
                        </div>
                        {member.status === "active" && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <p className="font-medium text-foreground">
                          {member.user.firstName && member.user.lastName
                            ? `${member.user.firstName} ${member.user.lastName}`
                            : member.user.email.split("@")[0]}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {member.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      {member.status === "invited" && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Pending
                        </span>
                      )}

                      {/* Role Badge or Selector */}
                      {member.role === "owner" ? (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border",
                          roleConfig.color
                        )}>
                          <RoleIcon className="h-3.5 w-3.5" />
                          {roleConfig.label}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              memberId: member.id,
                              role: e.target.value as "admin" | "manager" | "support" | "guide",
                            })
                          }
                          disabled={updateRoleMutation.isPending}
                          className="h-9 px-3 text-sm font-medium border border-border/60 rounded-lg bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="support">Support</option>
                          <option value="guide">Guide</option>
                        </select>
                      )}

                      {/* Remove Button */}
                      {member.role !== "owner" && (
                        <button
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: "Remove Team Member",
                              description:
                                "This will revoke their access to the organization. They can be re-invited later.",
                              confirmLabel: "Remove",
                              variant: "destructive",
                            });
                            if (confirmed) {
                              removeMemberMutation.mutate({ memberId: member.id });
                            }
                          }}
                          disabled={removeMemberMutation.isPending}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-150"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground">No team members yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                Invite colleagues to collaborate on managing your tours and bookings
              </p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Invite your first team member
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Role Permissions Reference */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <h3 className="font-semibold text-foreground">Role Permissions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Understanding access levels for each role
          </p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(ROLE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40 hover:border-border/60 transition-colors"
                >
                  <div className={cn("p-1.5 rounded-md", config.color.split(" ")[0])}>
                    <Icon className={cn("h-4 w-4", config.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {config.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border/60 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Invite Team Member</h3>
                    <p className="text-sm text-muted-foreground">
                      They'll receive an email invitation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError("");
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMemberMutation.mutate(inviteForm);
              }}
              className="p-6 space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="colleague@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">First Name</label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(e) =>
                      setInviteForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Last Name</label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(e) =>
                      setInviteForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      role: e.target.value as "admin" | "manager" | "support" | "guide",
                    }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="support">Support</option>
                  <option value="guide">Guide</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {ROLE_CONFIG[inviteForm.role].description}
                </p>
              </div>

              {inviteError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{inviteError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError("");
                  }}
                  className="flex-1 h-10 px-4 border border-input rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMemberMutation.isPending}
                  className="flex-1 h-10 px-4 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
                >
                  {inviteMemberMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmModal}
    </div>
  );
}
