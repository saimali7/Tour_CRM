"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Mail,
  MessageSquare,
  Save,
  Loader2,
  CheckCircle2,
  Users,
  Compass,
  CalendarCheck,
  CreditCard,
  Clock,
  XCircle,
  RotateCcw,
  AlertTriangle,
  CalendarDays,
  Megaphone,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type NotificationEvent = {
  email?: boolean;
  sms?: boolean;
  timing?: string;
};

type CustomerNotifications = {
  bookingConfirmed?: NotificationEvent;
  paymentReceived?: NotificationEvent;
  tourReminder24h?: NotificationEvent;
  tourReminder2h?: NotificationEvent;
  bookingCancelled?: NotificationEvent;
  refundProcessed?: NotificationEvent;
};

type StaffNotifications = {
  newBooking?: boolean;
  paymentReceived?: boolean;
  bookingCancelled?: boolean;
  lowAvailability?: boolean;
};

type GuideNotifications = {
  scheduleAssignment?: boolean;
  scheduleUpdate?: boolean;
  dayOfReminder?: boolean;
};

type NotificationSettings = {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  customer?: CustomerNotifications;
  staff?: StaffNotifications;
  guide?: GuideNotifications;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  smsEnabled: false,
  customer: {
    bookingConfirmed: { email: true, sms: false, timing: "immediate" },
    paymentReceived: { email: true, sms: false, timing: "immediate" },
    tourReminder24h: { email: true, sms: true, timing: "24h" },
    tourReminder2h: { email: false, sms: true, timing: "2h" },
    bookingCancelled: { email: true, sms: false, timing: "immediate" },
    refundProcessed: { email: true, sms: false, timing: "immediate" },
  },
  staff: {
    newBooking: true,
    paymentReceived: true,
    bookingCancelled: true,
    lowAvailability: true,
  },
  guide: {
    scheduleAssignment: true,
    scheduleUpdate: true,
    dayOfReminder: true,
  },
};

const TIMING_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "24h", label: "24h before" },
  { value: "2h", label: "2h before" },
  { value: "1h", label: "1h before" },
];

// Customer event configurations with icons
const CUSTOMER_EVENTS = [
  {
    key: "bookingConfirmed" as const,
    label: "Booking Confirmed",
    description: "Sent when booking is confirmed",
    icon: CalendarCheck,
    iconColor: "text-success",
    hasTiming: true,
  },
  {
    key: "paymentReceived" as const,
    label: "Payment Received",
    description: "Sent when payment is processed",
    icon: CreditCard,
    iconColor: "text-info",
    hasTiming: true,
  },
  {
    key: "tourReminder24h" as const,
    label: "Tour Reminder (24h)",
    description: "Reminder sent 24 hours before tour",
    icon: Clock,
    iconColor: "text-warning",
    fixedTiming: "24h before",
  },
  {
    key: "tourReminder2h" as const,
    label: "Tour Reminder (2h)",
    description: "Reminder sent 2 hours before tour",
    icon: Clock,
    iconColor: "text-warning",
    fixedTiming: "2h before",
  },
  {
    key: "bookingCancelled" as const,
    label: "Booking Cancelled",
    description: "Sent when booking is cancelled",
    icon: XCircle,
    iconColor: "text-destructive",
    hasTiming: true,
  },
  {
    key: "refundProcessed" as const,
    label: "Refund Processed",
    description: "Sent when refund is completed",
    icon: RotateCcw,
    iconColor: "text-info",
    hasTiming: true,
  },
];

const STAFF_EVENTS = [
  {
    key: "newBooking" as const,
    label: "New Booking",
    description: "When a new booking is created",
    icon: CalendarCheck,
    iconColor: "text-success",
  },
  {
    key: "paymentReceived" as const,
    label: "Payment Received",
    description: "When a payment is processed",
    icon: CreditCard,
    iconColor: "text-info",
  },
  {
    key: "bookingCancelled" as const,
    label: "Booking Cancelled",
    description: "When a booking is cancelled",
    icon: XCircle,
    iconColor: "text-destructive",
  },
  {
    key: "lowAvailability" as const,
    label: "Low Availability Alert",
    description: "When tour capacity is running low",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
];

const GUIDE_EVENTS = [
  {
    key: "scheduleAssignment" as const,
    label: "Schedule Assignment",
    description: "When assigned to a tour",
    icon: CalendarDays,
    iconColor: "text-info",
  },
  {
    key: "scheduleUpdate" as const,
    label: "Schedule Update",
    description: "When their schedule changes",
    icon: RotateCcw,
    iconColor: "text-warning",
  },
  {
    key: "dayOfReminder" as const,
    label: "Day-of Reminder",
    description: "Morning reminder for today's tours",
    icon: Megaphone,
    iconColor: "text-success",
  },
];

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const utils = trpc.useUtils();

  const { data: orgSettings, isLoading } = trpc.organization.getSettings.useQuery();

  const updateMutation = trpc.organization.updateSettings.useMutation({
    onSuccess: () => {
      utils.organization.getSettings.invalidate();
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save notification settings");
    },
  });

  // Load settings from organization
  useEffect(() => {
    if (orgSettings?.notificationSettings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...orgSettings.notificationSettings,
        customer: {
          ...DEFAULT_SETTINGS.customer,
          ...orgSettings.notificationSettings.customer,
        },
        staff: {
          ...DEFAULT_SETTINGS.staff,
          ...orgSettings.notificationSettings.staff,
        },
        guide: {
          ...DEFAULT_SETTINGS.guide,
          ...orgSettings.notificationSettings.guide,
        },
      });
    }
  }, [orgSettings]);

  const handleSave = () => {
    updateMutation.mutate({
      notificationSettings: settings,
    });
  };

  const updateEmailEnabled = (enabled: boolean) => {
    setSettings({ ...settings, emailEnabled: enabled });
    setHasChanges(true);
  };

  const updateSmsEnabled = (enabled: boolean) => {
    setSettings({ ...settings, smsEnabled: enabled });
    setHasChanges(true);
  };

  const updateCustomerEvent = (
    event: keyof CustomerNotifications,
    field: "email" | "sms" | "timing",
    value: boolean | string
  ) => {
    setSettings({
      ...settings,
      customer: {
        ...settings.customer,
        [event]: {
          ...settings.customer?.[event],
          [field]: value,
        },
      },
    });
    setHasChanges(true);
  };

  const updateStaffEvent = (event: keyof StaffNotifications, value: boolean) => {
    setSettings({
      ...settings,
      staff: {
        ...settings.staff,
        [event]: value,
      },
    });
    setHasChanges(true);
  };

  const updateGuideEvent = (event: keyof GuideNotifications, value: boolean) => {
    setSettings({
      ...settings,
      guide: {
        ...settings.guide,
        [event]: value,
      },
    });
    setHasChanges(true);
  };

  const isSubmitting = updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure when and how to notify customers, staff, and guides
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Success Toast */}
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300",
              saveSuccess
                ? "bg-success/10 text-success border border-success/20 translate-x-0 opacity-100"
                : "translate-x-4 opacity-0 pointer-events-none"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Changes saved</span>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSubmitting || !hasChanges}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
              hasChanges
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Channels Section */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Notification Channels</h3>
              <p className="text-xs text-muted-foreground">Enable or disable channels globally</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Email Channel */}
          <div className={cn(
            "flex items-center justify-between p-4 rounded-lg border transition-colors",
            settings.emailEnabled
              ? "border-success/30 bg-success/5"
              : "border-border bg-muted/30"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                settings.emailEnabled ? "bg-success/10" : "bg-muted"
              )}>
                <Mail className={cn(
                  "h-5 w-5 transition-colors",
                  settings.emailEnabled ? "text-success" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  Email Notifications
                  {settings.emailEnabled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">
                      ACTIVE
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Send notifications via email
                </p>
              </div>
            </div>
            <Switch
              checked={settings.emailEnabled}
              onCheckedChange={updateEmailEnabled}
            />
          </div>

          {/* SMS Channel */}
          <div className={cn(
            "flex items-center justify-between p-4 rounded-lg border transition-colors",
            settings.smsEnabled
              ? "border-success/30 bg-success/5"
              : "border-border bg-muted/30"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                settings.smsEnabled ? "bg-success/10" : "bg-muted"
              )}>
                <MessageSquare className={cn(
                  "h-5 w-5 transition-colors",
                  settings.smsEnabled ? "text-success" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  SMS Notifications
                  {settings.smsEnabled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">
                      ACTIVE
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Send notifications via SMS (requires SMS provider)
                </p>
              </div>
            </div>
            <Switch
              checked={settings.smsEnabled}
              onCheckedChange={updateSmsEnabled}
            />
          </div>
        </div>
      </div>

      {/* Customer Notifications */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
              <Users className="h-4 w-4 text-info" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Customer Notifications</h3>
              <p className="text-xs text-muted-foreground">Automated notifications sent to customers</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Event
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">
                  Email
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">
                  SMS
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-36">
                  Timing
                </th>
              </tr>
            </thead>
            <tbody>
              {CUSTOMER_EVENTS.map((event, index) => {
                const Icon = event.icon;
                const isLast = index === CUSTOMER_EVENTS.length - 1;
                return (
                  <tr
                    key={event.key}
                    className={cn(
                      "group hover:bg-muted/30 transition-colors",
                      !isLast && "border-b border-border/40"
                    )}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-background transition-colors">
                          <Icon className={cn("h-4 w-4", event.iconColor)} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{event.label}</p>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={settings.customer?.[event.key]?.email}
                          onCheckedChange={(checked) =>
                            updateCustomerEvent(event.key, "email", !!checked)
                          }
                          disabled={!settings.emailEnabled}
                          className={cn(!settings.emailEnabled && "opacity-40")}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={settings.customer?.[event.key]?.sms}
                          onCheckedChange={(checked) =>
                            updateCustomerEvent(event.key, "sms", !!checked)
                          }
                          disabled={!settings.smsEnabled}
                          className={cn(!settings.smsEnabled && "opacity-40")}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {event.fixedTiming ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium">
                          {event.fixedTiming}
                        </span>
                      ) : (
                        <Select
                          value={settings.customer?.[event.key]?.timing || "immediate"}
                          onValueChange={(value) =>
                            updateCustomerEvent(event.key, "timing", value)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMING_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Notifications */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
              <Users className="h-4 w-4 text-info" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Staff Notifications</h3>
              <p className="text-xs text-muted-foreground">Internal notifications for staff members</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Event
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">
                  Email
                </th>
              </tr>
            </thead>
            <tbody>
              {STAFF_EVENTS.map((event, index) => {
                const Icon = event.icon;
                const isLast = index === STAFF_EVENTS.length - 1;
                return (
                  <tr
                    key={event.key}
                    className={cn(
                      "group hover:bg-muted/30 transition-colors",
                      !isLast && "border-b border-border/40"
                    )}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-background transition-colors">
                          <Icon className={cn("h-4 w-4", event.iconColor)} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{event.label}</p>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={settings.staff?.[event.key]}
                          onCheckedChange={(checked) =>
                            updateStaffEvent(event.key, !!checked)
                          }
                          disabled={!settings.emailEnabled}
                          className={cn(!settings.emailEnabled && "opacity-40")}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Notifications */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <Compass className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Guide Notifications</h3>
              <p className="text-xs text-muted-foreground">Notifications for tour guides</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Event
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">
                  Email
                </th>
              </tr>
            </thead>
            <tbody>
              {GUIDE_EVENTS.map((event, index) => {
                const Icon = event.icon;
                const isLast = index === GUIDE_EVENTS.length - 1;
                return (
                  <tr
                    key={event.key}
                    className={cn(
                      "group hover:bg-muted/30 transition-colors",
                      !isLast && "border-b border-border/40"
                    )}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-background transition-colors">
                          <Icon className={cn("h-4 w-4", event.iconColor)} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{event.label}</p>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={settings.guide?.[event.key]}
                          onCheckedChange={(checked) =>
                            updateGuideEvent(event.key, !!checked)
                          }
                          disabled={!settings.emailEnabled}
                          className={cn(!settings.emailEnabled && "opacity-40")}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Bell className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              About Notifications
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>Email notifications are sent to customers and staff members</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>SMS notifications require an SMS provider to be configured</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>Tour reminders are automatically sent based on the configured timing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>Staff notifications are sent to all admin and manager users</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>Guide notifications are sent to the assigned guide's email</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
