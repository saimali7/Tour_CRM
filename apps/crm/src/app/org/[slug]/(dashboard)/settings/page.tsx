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
} from "lucide-react";

type SettingsTab = "business" | "booking" | "notifications" | "branding" | "team" | "payments";

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: "business" as const, label: "Business Profile", icon: Building2 },
    { id: "booking" as const, label: "Booking Settings", icon: Settings },
    { id: "payments" as const, label: "Payments", icon: CreditCard },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "branding" as const, label: "Branding", icon: Palette },
    { id: "team" as const, label: "Team", icon: Users },
  ];

  const isSubmitting =
    updateOrgMutation.isPending ||
    updateSettingsMutation.isPending ||
    updateBrandingMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your organization settings</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Business Profile Tab */}
      {activeTab === "business" && (
        <form onSubmit={handleSaveBusinessProfile} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessForm.name}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={businessForm.email}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={businessForm.phone}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={businessForm.timezone}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, timezone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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

          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              <MapPin className="h-5 w-5 inline mr-2" />
              Address
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={businessForm.address}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={businessForm.city}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={businessForm.state}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, state: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={businessForm.postalCode}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, postalCode: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={businessForm.country}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, country: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
      )}

      {/* Booking Settings Tab */}
      {activeTab === "booking" && (
        <form onSubmit={handleSaveBookingSettings} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Defaults</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Currency
                </label>
                <select
                  value={bookingForm.defaultCurrency}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, defaultCurrency: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Language
                </label>
                <select
                  value={bookingForm.defaultLanguage}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, defaultLanguage: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Customer Requirements</h2>

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
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
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
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  Require address for bookings
                </span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Policies</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe your cancellation policy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe your refund policy..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <form onSubmit={handleSaveNotifications} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">
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
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-500">
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
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
      )}

      {/* Branding Tab */}
      {activeTab === "branding" && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Brand Customization</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={brandingForm.logoUrl}
                  onChange={(e) =>
                    setBrandingForm((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used on customer-facing booking pages
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brandingForm.primaryColor}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandingForm.primaryColor}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono"
                  />
                </div>
              </div>
            </div>

            {brandingForm.logoUrl && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Logo Preview</p>
                <div className="w-48 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
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
              <p className="text-sm font-medium text-gray-700 mb-2">Color Preview</p>
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
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                <p className="text-sm text-gray-500">
                  Manage who has access to this organization
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <UserPlus className="h-4 w-4" />
                Invite Member
              </button>
            </div>

            {teamLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
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
                        <p className="font-medium text-gray-900">
                          {member.user.firstName && member.user.lastName
                            ? `${member.user.firstName} ${member.user.lastName}`
                            : member.user.email}
                        </p>
                        <p className="text-sm text-gray-500">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          member.status === "active"
                            ? "bg-green-100 text-green-700"
                            : member.status === "invited"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {member.status}
                      </span>

                      {member.role === "owner" ? (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
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
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="support">Support</option>
                          <option value="guide">Guide</option>
                        </select>
                      )}

                      {member.role !== "owner" && (
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to remove this member?")) {
                              removeMemberMutation.mutate({ memberId: member.id });
                            }
                          }}
                          disabled={removeMemberMutation.isPending}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(!teamMembers || teamMembers.length === 0) && (
                  <p className="text-center text-gray-500 py-8">No team members yet</p>
                )}
              </div>
            )}
          </div>

          {/* Role Descriptions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Role Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Owner</p>
                <p className="text-gray-500">Full access including billing and deletion</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Admin</p>
                <p className="text-gray-500">Full access except billing and org deletion</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Manager</p>
                <p className="text-gray-500">Manage bookings, schedules, and guides</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Support</p>
                <p className="text-gray-500">View and update bookings and customers</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Guide</p>
                <p className="text-gray-500">View assigned schedules and bookings only</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          {/* Stripe Connect Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Stripe Connect</h2>
                  <p className="text-sm text-gray-500">
                    Accept payments directly to your bank account
                  </p>
                </div>
              </div>
              {stripeStatus?.onboarded && (
                <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              )}
            </div>

            {stripeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : stripeStatus?.onboarded ? (
              // Connected state
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">
                        Your Stripe account is connected
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        You can accept payments and they will be deposited directly to your
                        linked bank account.
                      </p>
                    </div>
                  </div>
                </div>

                {stripeStatus.details && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Country</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {stripeStatus.details.country || "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                      <p className="font-medium text-gray-900 mt-1 truncate">
                        {stripeStatus.details.email || "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Charges Enabled
                      </p>
                      <p className="font-medium mt-1">
                        {stripeStatus.details.chargesEnabled ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Yes
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> No
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Payouts Enabled
                      </p>
                      <p className="font-medium mt-1">
                        {stripeStatus.details.payoutsEnabled ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Yes
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> No
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => getStripeDashboardMutation.mutate()}
                    disabled={getStripeDashboardMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {getStripeDashboardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Open Stripe Dashboard
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to disconnect your Stripe account? You will not be able to accept payments until you reconnect."
                        )
                      ) {
                        disconnectStripeMutation.mutate();
                      }
                    }}
                    disabled={disconnectStripeMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
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
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        Complete your Stripe setup
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        You have started the Stripe Connect setup but haven&apos;t completed
                        all the required steps.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => refreshStripeOnboardingMutation.mutate({ orgSlug: slug })}
                  disabled={refreshStripeOnboardingMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800">
                        Connect your Stripe account to accept payments
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        When customers book tours, payments will be processed through Stripe
                        and deposited directly into your connected bank account.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">What you&apos;ll need:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Business information (name, address)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Bank account details for payouts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Tax information (SSN/EIN for US businesses)
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => startStripeOnboardingMutation.mutate({ orgSlug: slug })}
                  disabled={startStripeOnboardingMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#635bff] text-white rounded-lg hover:bg-[#5851e5] font-medium disabled:opacity-50"
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              How Payments Work
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Customer Books</h4>
                <p className="text-sm text-gray-500">
                  Customers pay securely through your booking page
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Stripe Processes</h4>
                <p className="text-sm text-gray-500">
                  Payment is processed securely by Stripe
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">You Get Paid</h4>
                <p className="text-sm text-gray-500">
                  Funds are deposited to your bank account
                </p>
              </div>
            </div>
          </div>

          {/* Tax Configuration */}
          <form onSubmit={handleSaveTaxSettings} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tax Configuration</h3>
                <p className="text-sm text-gray-500 mt-1">
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
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">Enable tax</span>
              </label>
            </div>

            {taxForm.enabled && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Name
                    </label>
                    <select
                      value={taxForm.name}
                      onChange={(e) =>
                        setTaxForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID / Registration Number (optional)
                  </label>
                  <input
                    type="text"
                    value={taxForm.taxId}
                    onChange={(e) =>
                      setTaxForm((prev) => ({ ...prev, taxId: e.target.value }))
                    }
                    placeholder="e.g., GB123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be displayed on invoices and receipts
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.includeInPrice}
                      onChange={(e) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          includeInPrice: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Prices include tax
                      </p>
                      <p className="text-xs text-gray-500">
                        If enabled, your displayed prices already include tax. If
                        disabled, tax will be added at checkout.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.applyToFees}
                      onChange={(e) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          applyToFees: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Apply tax to booking fees
                      </p>
                      <p className="text-xs text-gray-500">
                        Apply tax to any additional booking or service fees
                      </p>
                    </div>
                  </label>
                </div>

                {/* Tax Preview */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    Tax Calculation Preview
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
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
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError("");
                }}
                className="text-gray-400 hover:text-gray-600"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="colleague@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(e) =>
                      setInviteForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(e) =>
                      setInviteForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="support">Support</option>
                  <option value="guide">Guide</option>
                </select>
              </div>

              {inviteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{inviteError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMemberMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
    </div>
  );
}
