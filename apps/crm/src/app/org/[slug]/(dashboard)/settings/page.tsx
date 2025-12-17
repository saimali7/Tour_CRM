"use client";

import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  Settings,
  Bell,
  Palette,
  Save,
  Loader2,
  CheckCircle,
  Globe,
  Mail,
  Phone,
  MapPin,
  Users,
  UserPlus,
  MoreHorizontal,
  Shield,
  Trash2,
  X,
  CreditCard,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ServiceHealthPanel } from "@/components/settings/service-health";

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
  const { confirm, ConfirmModal } = useConfirmModal();

  const { data: organization, isLoading } = trpc.organization.get.useQuery();
  const { data: settings } = trpc.organization.getSettings.useQuery();
  const { data: teamMembers, isLoading: teamLoading } = trpc.team.list.useQuery();
  const { data: stripeStatus, isLoading: stripeLoading, refetch: refetchStripe } =
    trpc.organization.getStripeConnectStatus.useQuery();

  // Team management state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    role: "admin" | "manager" | "support" | "guide";
  }>({
    email: "",
    firstName: "",
    lastName: "",
    role: "support",
  });
  const [inviteError, setInviteError] = useState("");

  const utils = trpc.useUtils();

  const updateOrgMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      utils.organization.get.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const updateSettingsMutation = trpc.organization.updateSettings.useMutation({
    onSuccess: () => {
      utils.organization.getSettings.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const updateBrandingMutation = trpc.organization.updateBranding.useMutation({
    onSuccess: () => {
      utils.organization.get.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const inviteMemberMutation = trpc.team.invite.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setShowInviteModal(false);
      setInviteForm({ email: "", firstName: "", lastName: "", role: "support" as const });
      setInviteError("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error) => {
      setInviteError(error.message);
    },
  });

  const updateRoleMutation = trpc.team.updateRole.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
    },
  });

  const removeMemberMutation = trpc.team.remove.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
    },
  });

  // Stripe Connect mutations
  const startStripeOnboardingMutation = trpc.organization.startStripeConnectOnboarding.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const refreshStripeOnboardingMutation = trpc.organization.refreshStripeConnectOnboarding.useMutation({
    onSuccess: (data) => {
      if (data.alreadyOnboarded) {
        refetchStripe();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const getStripeDashboardMutation = trpc.organization.getStripeDashboardLink.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
  });

  const disconnectStripeMutation = trpc.organization.disconnectStripeConnect.useMutation({
    onSuccess: () => {
      refetchStripe();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const [businessForm, setBusinessForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    timezone: "",
  });

  const [bookingForm, setBookingForm] = useState({
    defaultCurrency: "USD",
    defaultLanguage: "en",
    requirePhoneNumber: false,
    requireAddress: false,
    cancellationPolicy: "",
    refundPolicy: "",
    bookingWindow: {
      minimumNoticeHours: 2,
      maximumAdvanceDays: 90,
      allowSameDayBooking: true,
      sameDayCutoffTime: "12:00",
    },
  });

  const [notificationForm, setNotificationForm] = useState({
    emailNotifications: true,
    smsNotifications: false,
  });

  const [brandingForm, setBrandingForm] = useState({
    logoUrl: "",
    primaryColor: "#0f766e",
  });

  const [taxForm, setTaxForm] = useState({
    enabled: false,
    name: "VAT",
    rate: 0,
    taxId: "",
    includeInPrice: false,
    applyToFees: true,
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentLinkExpirationHours: 24,
    autoSendPaymentReminders: true,
    paymentReminderHours: 6,
    depositEnabled: false,
    depositType: "percentage" as "percentage" | "fixed",
    depositAmount: 25,
    depositDueDays: 7,
    acceptedPaymentMethods: ["card", "cash", "bank_transfer"] as Array<"card" | "cash" | "bank_transfer" | "check" | "other">,
    allowOnlinePayments: true,
    allowPartialPayments: false,
    autoRefundOnCancellation: false,
    refundDeadlineHours: 48,
  });

  // Initialize forms when data loads
  useEffect(() => {
    if (organization) {
      setBusinessForm({
        name: organization.name || "",
        email: organization.email || "",
        phone: organization.phone || "",
        website: organization.website || "",
        address: organization.address || "",
        city: organization.city || "",
        state: organization.state || "",
        country: organization.country || "",
        postalCode: organization.postalCode || "",
        timezone: organization.timezone || "",
      });
      setBrandingForm({
        logoUrl: organization.logoUrl || "",
        primaryColor: organization.primaryColor || "#0f766e",
      });
    }
  }, [organization]);

  useEffect(() => {
    if (settings) {
      setBookingForm({
        defaultCurrency: settings.defaultCurrency || "USD",
        defaultLanguage: settings.defaultLanguage || "en",
        requirePhoneNumber: settings.requirePhoneNumber || false,
        requireAddress: settings.requireAddress || false,
        cancellationPolicy: settings.cancellationPolicy || "",
        refundPolicy: settings.refundPolicy || "",
        bookingWindow: {
          minimumNoticeHours: settings.bookingWindow?.minimumNoticeHours ?? 2,
          maximumAdvanceDays: settings.bookingWindow?.maximumAdvanceDays ?? 90,
          allowSameDayBooking: settings.bookingWindow?.allowSameDayBooking ?? true,
          sameDayCutoffTime: settings.bookingWindow?.sameDayCutoffTime || "12:00",
        },
      });
      setNotificationForm({
        emailNotifications: settings.emailNotifications ?? true,
        smsNotifications: settings.smsNotifications ?? false,
      });
      if (settings.tax) {
        setTaxForm({
          enabled: settings.tax.enabled,
          name: settings.tax.name || "VAT",
          rate: settings.tax.rate || 0,
          taxId: settings.tax.taxId || "",
          includeInPrice: settings.tax.includeInPrice || false,
          applyToFees: settings.tax.applyToFees ?? true,
        });
      }
      if (settings.payment) {
        setPaymentForm({
          paymentLinkExpirationHours: settings.payment.paymentLinkExpirationHours ?? 24,
          autoSendPaymentReminders: settings.payment.autoSendPaymentReminders ?? true,
          paymentReminderHours: settings.payment.paymentReminderHours ?? 6,
          depositEnabled: settings.payment.depositEnabled ?? false,
          depositType: settings.payment.depositType ?? "percentage",
          depositAmount: settings.payment.depositAmount ?? 25,
          depositDueDays: settings.payment.depositDueDays ?? 7,
          acceptedPaymentMethods: settings.payment.acceptedPaymentMethods ?? ["card", "cash", "bank_transfer"],
          allowOnlinePayments: settings.payment.allowOnlinePayments ?? true,
          allowPartialPayments: settings.payment.allowPartialPayments ?? false,
          autoRefundOnCancellation: settings.payment.autoRefundOnCancellation ?? false,
          refundDeadlineHours: settings.payment.refundDeadlineHours ?? 48,
        });
      }
    }
  }, [settings]);

  const handleSaveBusinessProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgMutation.mutate(businessForm);
  };

  const handleSaveBookingSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(bookingForm);
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(notificationForm);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrandingMutation.mutate(brandingForm);
  };

  const handleSaveTaxSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ tax: taxForm });
  };

  const handleSavePaymentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ payment: paymentForm });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isSubmitting =
    updateOrgMutation.isPending ||
    updateSettingsMutation.isPending ||
    updateBrandingMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your organization settings</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Settings saved successfully</span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none">
          <TabsTrigger
            value="business"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <Building2 className="h-4 w-4" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger
            value="booking"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <Settings className="h-4 w-4" />
            Booking Settings
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="branding"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <Activity className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Business Profile Tab */}
        <TabsContent value="business">
          <form onSubmit={handleSaveBusinessProfile} className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Business Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessForm.name}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={businessForm.email}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={businessForm.phone}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Globe className="h-4 w-4 inline mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  value={businessForm.website}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, website: e.target.value }))
                  }
                  placeholder="https://"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Timezone
                </label>
                <select
                  value={businessForm.timezone}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, timezone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select timezone</option>
                  <option value="America/New_York">Eastern Time (US)</option>
                  <option value="America/Chicago">Central Time (US)</option>
                  <option value="America/Denver">Mountain Time (US)</option>
                  <option value="America/Los_Angeles">Pacific Time (US)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">
              <MapPin className="h-5 w-5 inline mr-2" />
              Address
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={businessForm.address}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={businessForm.city}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={businessForm.state}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, state: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={businessForm.postalCode}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, postalCode: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={businessForm.country}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, country: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
          </form>
        </TabsContent>

        {/* Booking Settings Tab */}
        <TabsContent value="booking">
          <form onSubmit={handleSaveBookingSettings} className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Defaults</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Default Currency
                </label>
                <select
                  value={bookingForm.defaultCurrency}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, defaultCurrency: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Default Language
                </label>
                <select
                  value={bookingForm.defaultLanguage}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, defaultLanguage: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Booking Window
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Control when customers can make bookings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Minimum Notice Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={bookingForm.bookingWindow.minimumNoticeHours}
                  onChange={(e) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      bookingWindow: {
                        ...prev.bookingWindow,
                        minimumNoticeHours: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How many hours before a tour can customers book
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Maximum Advance Days
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={bookingForm.bookingWindow.maximumAdvanceDays}
                  onChange={(e) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      bookingWindow: {
                        ...prev.bookingWindow,
                        maximumAdvanceDays: parseInt(e.target.value) || 1,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How far in advance can customers book
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookingForm.bookingWindow.allowSameDayBooking}
                  onChange={(e) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      bookingWindow: {
                        ...prev.bookingWindow,
                        allowSameDayBooking: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  Allow same-day booking
                </span>
              </label>

              {bookingForm.bookingWindow.allowSameDayBooking && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Same-Day Cutoff Time
                  </label>
                  <input
                    type="time"
                    value={bookingForm.bookingWindow.sameDayCutoffTime}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        bookingWindow: {
                          ...prev.bookingWindow,
                          sameDayCutoffTime: e.target.value,
                        },
                      }))
                    }
                    className="w-full md:w-64 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Latest time customers can book for same-day tours
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Customer Requirements</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookingForm.requirePhoneNumber}
                  onChange={(e) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      requirePhoneNumber: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  Require phone number for bookings
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookingForm.requireAddress}
                  onChange={(e) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      requireAddress: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  Require address for bookings
                </span>
              </label>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Policies</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Cancellation Policy
                </label>
                <textarea
                  value={bookingForm.cancellationPolicy}
                  onChange={(e) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      cancellationPolicy: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe your cancellation policy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Refund Policy
                </label>
                <textarea
                  value={bookingForm.refundPolicy}
                  onChange={(e) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      refundPolicy: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe your refund policy..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
          </form>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <form onSubmit={handleSaveNotifications} className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Send booking confirmations and reminders via email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationForm.emailNotifications}
                  onChange={(e) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      emailNotifications: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-input text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Send booking confirmations and reminders via SMS
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationForm.smsNotifications}
                  onChange={(e) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      smsNotifications: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-input text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
          </form>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Brand Customization</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={brandingForm.logoUrl}
                  onChange={(e) =>
                    setBrandingForm((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used on customer-facing booking pages
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brandingForm.primaryColor}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="h-10 w-20 rounded border border-input cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandingForm.primaryColor}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono"
                  />
                </div>
              </div>
            </div>

            {brandingForm.logoUrl && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Logo Preview</p>
                <div className="w-48 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={brandingForm.logoUrl}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Color Preview</p>
              <div className="flex gap-4">
                <div
                  className="w-24 h-10 rounded-lg"
                  style={{ backgroundColor: brandingForm.primaryColor }}
                />
                <div
                  className="w-24 h-10 rounded-lg"
                  style={{ backgroundColor: brandingForm.primaryColor, opacity: 0.7 }}
                />
                <div
                  className="w-24 h-10 rounded-lg"
                  style={{ backgroundColor: brandingForm.primaryColor, opacity: 0.3 }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
          </form>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
                <p className="text-sm text-muted-foreground">
                  Manage who has access to this organization
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                <UserPlus className="h-4 w-4" />
                Invite Member
              </button>
            </div>

            {teamLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {member.user.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt=""
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-primary font-medium">
                            {(member.user.firstName?.[0] || member.user.email[0] || "?").toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.user.firstName && member.user.lastName
                            ? `${member.user.firstName} ${member.user.lastName}`
                            : member.user.email}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          member.status === "active"
                            ? "bg-success/20 text-success"
                            : member.status === "invited"
                            ? "bg-warning/20 text-warning"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {member.status}
                      </span>

                      {member.role === "owner" ? (
                        <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Owner
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
                          className="text-sm border border-input rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="support">Support</option>
                          <option value="guide">Guide</option>
                        </select>
                      )}

                      {member.role !== "owner" && (
                        <button
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: "Remove Team Member",
                              description: "This will remove this team member from your organization. They will lose access to all organization data and features. This action cannot be undone.",
                              confirmLabel: "Remove Member",
                              variant: "destructive",
                            });

                            if (confirmed) {
                              removeMemberMutation.mutate({ memberId: member.id });
                            }
                          }}
                          disabled={removeMemberMutation.isPending}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(!teamMembers || teamMembers.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No team members yet</p>
                )}
              </div>
            )}
          </div>

          {/* Role Descriptions */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Role Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Owner</p>
                <p className="text-muted-foreground">Full access including billing and deletion</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Admin</p>
                <p className="text-muted-foreground">Full access except billing and org deletion</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Manager</p>
                <p className="text-muted-foreground">Manage bookings, schedules, and guides</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Support</p>
                <p className="text-muted-foreground">View and update bookings and customers</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">Guide</p>
                <p className="text-muted-foreground">View assigned schedules and bookings only</p>
              </div>
            </div>
          </div>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <div className="space-y-6">
          {/* Stripe Connect Status Card */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Stripe Connect</h2>
                  <p className="text-sm text-muted-foreground">
                    Accept payments directly to your bank account
                  </p>
                </div>
              </div>
              {stripeStatus?.onboarded && (
                <span className="flex items-center gap-1 px-3 py-1 bg-success/20 text-success rounded-full text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              )}
            </div>

            {stripeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stripeStatus?.onboarded ? (
              // Connected state
              <div className="space-y-4">
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium text-success">
                        Your Stripe account is connected
                      </p>
                      <p className="text-sm text-success/80 mt-1">
                        You can accept payments and they will be deposited directly to your
                        linked bank account.
                      </p>
                    </div>
                  </div>
                </div>

                {stripeStatus.details && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Country</p>
                      <p className="font-medium text-foreground mt-1">
                        {stripeStatus.details.country || "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                      <p className="font-medium text-foreground mt-1 truncate">
                        {stripeStatus.details.email || "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Charges Enabled
                      </p>
                      <p className="font-medium mt-1">
                        {stripeStatus.details.chargesEnabled ? (
                          <span className="text-success flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Yes
                          </span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> No
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Payouts Enabled
                      </p>
                      <p className="font-medium mt-1">
                        {stripeStatus.details.payoutsEnabled ? (
                          <span className="text-success flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Yes
                          </span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> No
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => getStripeDashboardMutation.mutate()}
                    disabled={getStripeDashboardMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {getStripeDashboardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Open Stripe Dashboard
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: "Disconnect Stripe Account",
                        description: "Are you sure you want to disconnect your Stripe account? You will not be able to accept payments until you reconnect. This will not affect existing transactions or payouts.",
                        confirmLabel: "Disconnect Stripe",
                        variant: "destructive",
                      });

                      if (confirmed) {
                        disconnectStripeMutation.mutate();
                      }
                    }}
                    disabled={disconnectStripeMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {disconnectStripeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Disconnect
                  </button>
                </div>
              </div>
            ) : stripeStatus?.connected && !stripeStatus?.onboarded ? (
              // Partially connected - needs to complete onboarding
              <div className="space-y-4">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">
                        Complete your Stripe setup
                      </p>
                      <p className="text-sm text-warning/80 mt-1">
                        You have started the Stripe Connect setup but haven&apos;t completed
                        all the required steps.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => refreshStripeOnboardingMutation.mutate({ orgSlug: slug })}
                  disabled={refreshStripeOnboardingMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {refreshStripeOnboardingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Continue Stripe Setup
                </button>
              </div>
            ) : (
              // Not connected
              <div className="space-y-4">
                <div className="p-4 bg-muted border border-border rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        Connect your Stripe account to accept payments
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        When customers book tours, payments will be processed through Stripe
                        and deposited directly into your connected bank account.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">What you&apos;ll need:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Business information (name, address)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Bank account details for payouts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Tax information (SSN/EIN for US businesses)
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => startStripeOnboardingMutation.mutate({ orgSlug: slug })}
                  disabled={startStripeOnboardingMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#635bff] text-primary-foreground rounded-lg hover:bg-[#5851e5] font-medium disabled:opacity-50"
                >
                  {startStripeOnboardingMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                  Connect with Stripe
                </button>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              How Payments Work
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h4 className="font-medium text-foreground mb-1">Customer Books</h4>
                <p className="text-sm text-muted-foreground">
                  Customers pay securely through your booking page
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h4 className="font-medium text-foreground mb-1">Stripe Processes</h4>
                <p className="text-sm text-muted-foreground">
                  Payment is processed securely by Stripe
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h4 className="font-medium text-foreground mb-1">You Get Paid</h4>
                <p className="text-sm text-muted-foreground">
                  Funds are deposited to your bank account
                </p>
              </div>
            </div>
          </div>

          {/* Tax Configuration */}
          <form onSubmit={handleSaveTaxSettings} className="bg-card rounded-lg border border-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Tax Configuration</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure tax settings for your bookings
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxForm.enabled}
                  onChange={(e) =>
                    setTaxForm((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">Enable tax</span>
              </label>
            </div>

            {taxForm.enabled && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Tax Name
                    </label>
                    <select
                      value={taxForm.name}
                      onChange={(e) =>
                        setTaxForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="VAT">VAT (Value Added Tax)</option>
                      <option value="Sales Tax">Sales Tax</option>
                      <option value="GST">GST (Goods and Services Tax)</option>
                      <option value="HST">HST (Harmonized Sales Tax)</option>
                      <option value="Tourism Tax">Tourism Tax</option>
                      <option value="City Tax">City Tax</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Tax Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxForm.rate}
                        onChange={(e) =>
                          setTaxForm((prev) => ({
                            ...prev,
                            rate: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Tax ID / Registration Number (optional)
                  </label>
                  <input
                    type="text"
                    value={taxForm.taxId}
                    onChange={(e) =>
                      setTaxForm((prev) => ({ ...prev, taxId: e.target.value }))
                    }
                    placeholder="e.g., GB123456789"
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be displayed on invoices and receipts
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.includeInPrice}
                      onChange={(e) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          includeInPrice: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Prices include tax
                      </p>
                      <p className="text-xs text-muted-foreground">
                        If enabled, your displayed prices already include tax. If
                        disabled, tax will be added at checkout.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.applyToFees}
                      onChange={(e) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          applyToFees: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Apply tax to booking fees
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Apply tax to any additional booking or service fees
                      </p>
                    </div>
                  </label>
                </div>

                {/* Tax Preview */}
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <h4 className="text-sm font-medium text-primary mb-2">
                    Tax Calculation Preview
                  </h4>
                  <div className="text-sm text-primary/80 space-y-1">
                    <p>
                      For a $100 booking with {taxForm.rate}% {taxForm.name}:
                    </p>
                    {taxForm.includeInPrice ? (
                      <>
                        <p>
                          Base price (excl. tax): $
                          {(100 / (1 + taxForm.rate / 100)).toFixed(2)}
                        </p>
                        <p>
                          {taxForm.name}: $
                          {(100 - 100 / (1 + taxForm.rate / 100)).toFixed(2)}
                        </p>
                        <p className="font-medium">Total: $100.00</p>
                      </>
                    ) : (
                      <>
                        <p>Base price: $100.00</p>
                        <p>
                          {taxForm.name}: ${(100 * (taxForm.rate / 100)).toFixed(2)}
                        </p>
                        <p className="font-medium">
                          Total: ${(100 * (1 + taxForm.rate / 100)).toFixed(2)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Tax Settings
              </button>
            </div>
          </form>

          {/* Payment Settings */}
          <form onSubmit={handleSavePaymentSettings} className="bg-card rounded-lg border border-border p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Payment Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure payment options, deposits, and refund policies
              </p>
            </div>

            {/* Payment Link Settings */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Payment Link Settings
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Link Expiration (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={paymentForm.paymentLinkExpirationHours}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentLinkExpirationHours: parseInt(e.target.value) || 24,
                      }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Payment links expire after this many hours (1-168)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Reminder Hours Before Expiry
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={paymentForm.paymentReminderHours}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentReminderHours: parseInt(e.target.value) || 6,
                      }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Send reminder this many hours before link expires
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.autoSendPaymentReminders}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      autoSendPaymentReminders: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Auto-send payment reminders
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically send a reminder email before payment links expire
                  </p>
                </div>
              </label>
            </div>

            {/* Deposit Settings */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Deposit Settings</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentForm.depositEnabled}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        depositEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Enable deposits</span>
                </label>
              </div>

              {paymentForm.depositEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Deposit Type
                      </label>
                      <select
                        value={paymentForm.depositType}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            depositType: e.target.value as "percentage" | "fixed",
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {paymentForm.depositType === "percentage" ? "Deposit %" : "Deposit Amount"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max={paymentForm.depositType === "percentage" ? 100 : 10000}
                          step={paymentForm.depositType === "percentage" ? 5 : 10}
                          value={paymentForm.depositAmount}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              depositAmount: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {paymentForm.depositType === "percentage" ? "%" : bookingForm.defaultCurrency}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Balance Due (days before)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={paymentForm.depositDueDays}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            depositDueDays: parseInt(e.target.value) || 7,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Days before tour when balance is due
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <h5 className="text-sm font-medium text-primary mb-1">Deposit Preview</h5>
                    <p className="text-sm text-primary/80">
                      For a {bookingForm.defaultCurrency} 100 booking:{" "}
                      {paymentForm.depositType === "percentage"
                        ? `${bookingForm.defaultCurrency} ${(100 * paymentForm.depositAmount / 100).toFixed(2)} deposit, ${bookingForm.defaultCurrency} ${(100 - 100 * paymentForm.depositAmount / 100).toFixed(2)} balance`
                        : `${bookingForm.defaultCurrency} ${Math.min(paymentForm.depositAmount, 100).toFixed(2)} deposit, ${bookingForm.defaultCurrency} ${Math.max(100 - paymentForm.depositAmount, 0).toFixed(2)} balance`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground">Accepted Payment Methods</h4>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { value: "card", label: "Card" },
                  { value: "cash", label: "Cash" },
                  { value: "bank_transfer", label: "Bank Transfer" },
                  { value: "check", label: "Check" },
                  { value: "other", label: "Other" },
                ].map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      paymentForm.acceptedPaymentMethods.includes(method.value as typeof paymentForm.acceptedPaymentMethods[number])
                        ? "bg-primary/10 border-primary"
                        : "bg-muted border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={paymentForm.acceptedPaymentMethods.includes(method.value as typeof paymentForm.acceptedPaymentMethods[number])}
                      onChange={(e) => {
                        const newMethods = e.target.checked
                          ? [...paymentForm.acceptedPaymentMethods, method.value as typeof paymentForm.acceptedPaymentMethods[number]]
                          : paymentForm.acceptedPaymentMethods.filter((m) => m !== method.value);
                        setPaymentForm((prev) => ({
                          ...prev,
                          acceptedPaymentMethods: newMethods,
                        }));
                      }}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-foreground">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Online Payment Options */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground">Online Payment Options</h4>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.allowOnlinePayments}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      allowOnlinePayments: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Allow online payments
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Accept card payments through Stripe Checkout
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.allowPartialPayments}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      allowPartialPayments: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Allow partial payments
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Let customers pay in installments (requires manual tracking)
                  </p>
                </div>
              </label>
            </div>

            {/* Refund Settings */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground">Refund Settings</h4>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Refund Deadline (hours before tour)
                </label>
                <input
                  type="number"
                  min="0"
                  max="720"
                  value={paymentForm.refundDeadlineHours}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      refundDeadlineHours: parseInt(e.target.value) || 48,
                    }))
                  }
                  className="w-full md:w-1/3 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Customers can request refunds up to this many hours before the tour starts (0 = no refunds)
                </p>
              </div>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.autoRefundOnCancellation}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      autoRefundOnCancellation: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Auto-refund on cancellation
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically process refunds when bookings are cancelled within the deadline
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Payment Settings
              </button>
            </div>
          </form>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <ServiceHealthPanel orgSlug={slug} isActive={activeTab === "system"} />
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Invite Team Member</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError("");
                }}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMemberMutation.mutate(inviteForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="colleague@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(e) =>
                      setInviteForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(e) =>
                      setInviteForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      role: e.target.value as "admin" | "manager" | "support" | "guide",
                    }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="support">Support</option>
                  <option value="guide">Guide</option>
                </select>
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
                  className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMemberMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
