"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Mail,
  MessageSquare,
  FileText,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  Send,
  Zap,
  Search,
  Filter,
} from "lucide-react";
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";

type TabType = "history" | "email-templates" | "sms-templates" | "automations";

interface TemplateFormData {
  name: string;
  type: string;
  description: string;
  subject: string;
  contentHtml: string;
  contentPlain: string;
  isActive: boolean;
}

const EMAIL_TEMPLATE_TYPES = [
  { value: "booking_confirmation", label: "Booking Confirmation", description: "Sent when a booking is confirmed" },
  { value: "booking_reminder", label: "Booking Reminder", description: "Sent before tour date" },
  { value: "booking_modification", label: "Booking Modified", description: "Sent when booking details change" },
  { value: "booking_cancellation", label: "Booking Cancellation", description: "Sent when booking is cancelled" },
  { value: "schedule_cancellation", label: "Schedule Cancellation", description: "Sent when a schedule is cancelled" },
  { value: "review_request", label: "Review Request", description: "Sent after tour completion" },
  { value: "abandoned_cart_1", label: "Abandoned Cart (15 min)", description: "First cart recovery email" },
  { value: "abandoned_cart_2", label: "Abandoned Cart (24h)", description: "Second cart recovery email" },
  { value: "abandoned_cart_3", label: "Abandoned Cart (72h)", description: "Final cart recovery email" },
  { value: "price_drop_alert", label: "Price Drop Alert", description: "Notify wishlist customers of price drops" },
  { value: "availability_alert", label: "Availability Alert", description: "Notify when spots become available" },
  { value: "wishlist_digest", label: "Wishlist Digest", description: "Weekly wishlist update" },
  { value: "custom", label: "Custom", description: "Custom template for manual sends" },
];

const TEMPLATE_VARIABLES = [
  { name: "{{customer_name}}", description: "Customer's full name" },
  { name: "{{customer_first_name}}", description: "Customer's first name" },
  { name: "{{customer_email}}", description: "Customer's email" },
  { name: "{{tour_name}}", description: "Tour name" },
  { name: "{{tour_date}}", description: "Tour date" },
  { name: "{{tour_time}}", description: "Tour start time" },
  { name: "{{booking_reference}}", description: "Booking reference number" },
  { name: "{{booking_total}}", description: "Total booking amount" },
  { name: "{{participants}}", description: "Number of participants" },
  { name: "{{organization_name}}", description: "Your business name" },
  { name: "{{recovery_link}}", description: "Cart recovery link (abandoned cart only)" },
  { name: "{{unsubscribe_link}}", description: "Unsubscribe link" },
];

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{id: string, type: "email" | "sms"} | null>(null);
  const { confirm, ConfirmModal } = useConfirmModal();
  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    name: "",
    type: "booking_confirmation",
    description: "",
    subject: "",
    contentHtml: "",
    contentPlain: "",
    isActive: true,
  });
  const [logFilters, setLogFilters] = useState({
    type: undefined as "email" | "sms" | undefined,
    status: undefined as string | undefined,
    search: "",
  });
  const [showPreview, setShowPreview] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: logs, isLoading: logsLoading } = trpc.communication.listLogs.useQuery({
    filters: {
      type: logFilters.type,
      status: logFilters.status as "pending" | "sent" | "delivered" | "failed" | "bounced" | "opened" | "clicked" | undefined,
      search: logFilters.search || undefined,
    },
    pagination: { page: 1, limit: 50 },
  });

  const { data: emailTemplates, isLoading: emailTemplatesLoading } = trpc.communication.listEmailTemplates.useQuery();
  const { data: smsTemplates, isLoading: smsTemplatesLoading } = trpc.communication.listSmsTemplates.useQuery();
  const { data: automations, isLoading: automationsLoading } = trpc.communication.listAutomations.useQuery();
  const { data: logStats } = trpc.communication.getLogStats.useQuery();

  // Mutations
  const createEmailTemplateMutation = trpc.communication.createEmailTemplate.useMutation({
    onSuccess: () => {
      utils.communication.listEmailTemplates.invalidate();
      setShowTemplateModal(false);
      resetForm();
    },
  });

  const updateEmailTemplateMutation = trpc.communication.updateEmailTemplate.useMutation({
    onSuccess: () => {
      utils.communication.listEmailTemplates.invalidate();
      setShowTemplateModal(false);
      setEditingTemplate(null);
      resetForm();
    },
  });

  const deleteEmailTemplateMutation = trpc.communication.deleteEmailTemplate.useMutation({
    onSuccess: () => {
      utils.communication.listEmailTemplates.invalidate();
    },
  });

  const toggleAutomationMutation = trpc.communication.toggleAutomation.useMutation({
    onSuccess: () => {
      utils.communication.listAutomations.invalidate();
    },
  });

  const resetForm = () => {
    setTemplateForm({
      name: "",
      type: "booking_confirmation",
      description: "",
      subject: "",
      contentHtml: "",
      contentPlain: "",
      isActive: true,
    });
  };

  const handleEditTemplate = (template: NonNullable<typeof emailTemplates>[0]) => {
    setEditingTemplate({ id: template.id, type: "email" });
    setTemplateForm({
      name: template.name,
      type: template.type,
      description: template.description || "",
      subject: template.subject,
      contentHtml: template.contentHtml,
      contentPlain: template.contentPlain || "",
      isActive: template.isActive ?? true,
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateEmailTemplateMutation.mutate({
        id: editingTemplate.id,
        data: {
          name: templateForm.name,
          description: templateForm.description || undefined,
          subject: templateForm.subject,
          contentHtml: templateForm.contentHtml,
          contentPlain: templateForm.contentPlain || undefined,
          isActive: templateForm.isActive,
        },
      });
    } else {
      createEmailTemplateMutation.mutate({
        name: templateForm.name,
        type: templateForm.type as "booking_confirmation" | "booking_reminder" | "booking_modification" | "booking_cancellation" | "schedule_cancellation" | "review_request" | "abandoned_cart_1" | "abandoned_cart_2" | "abandoned_cart_3" | "browse_abandonment" | "price_drop_alert" | "availability_alert" | "wishlist_digest" | "custom",
        description: templateForm.description || undefined,
        subject: templateForm.subject,
        contentHtml: templateForm.contentHtml,
        contentPlain: templateForm.contentPlain || undefined,
        isActive: templateForm.isActive,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
      case "opened":
      case "clicked":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success/10 text-success"><CheckCircle className="h-3 w-3" /> {status}</span>;
      case "sent":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"><Send className="h-3 w-3" /> {status}</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning"><Clock className="h-3 w-3" /> {status}</span>;
      case "failed":
      case "bounced":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive"><XCircle className="h-3 w-3" /> {status}</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-foreground">{status}</span>;
    }
  };

  const tabs = [
    { id: "history" as const, label: "History", icon: Clock },
    { id: "email-templates" as const, label: "Email Templates", icon: Mail },
    { id: "sms-templates" as const, label: "SMS Templates", icon: MessageSquare },
    { id: "automations" as const, label: "Automations", icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communications</h1>
          <p className="text-muted-foreground mt-1">Manage email templates, SMS, and communication history</p>
        </div>
      </div>

      {/* Stats */}
      {logStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">Total Sent</p>
            <p className="text-2xl font-bold text-foreground">{logStats.totalSent}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">Emails</p>
            <p className="text-2xl font-bold text-foreground">{logStats.byType.email || 0}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">SMS</p>
            <p className="text-2xl font-bold text-foreground">{logStats.byType.sms || 0}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">Delivered Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {logStats.totalSent > 0
                ? Math.round((logStats.totalDelivered / logStats.totalSent) * 100)
                : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-input"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by email, name..."
                  value={logFilters.search}
                  onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <select
                value={logFilters.type || ""}
                onChange={(e) => setLogFilters({ ...logFilters, type: e.target.value as "email" | "sms" | undefined || undefined })}
                className="px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">All Types</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <select
                value={logFilters.status || ""}
                onChange={(e) => setLogFilters({ ...logFilters, status: e.target.value || undefined })}
                className="px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="opened">Opened</option>
                <option value="clicked">Clicked</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {logsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs?.data && logs.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {logs.data.map((log) => (
                      <tr key={log.id} className="hover:bg-muted">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            log.type === "email" ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"
                          }`}>
                            {log.type === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                            {log.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">{log.recipientName || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{log.recipientEmail || log.recipientPhone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-foreground truncate max-w-xs">{log.subject || "-"}</p>
                          {log.templateName && (
                            <p className="text-xs text-muted-foreground">Template: {log.templateName}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {log.sentAt ? format(new Date(log.sentAt), "MMM d, yyyy HH:mm") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No communications yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Communications will appear here when emails or SMS are sent.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Templates Tab */}
      {activeTab === "email-templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetForm();
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          </div>

          {emailTemplatesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : emailTemplates && emailTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emailTemplates.map((template) => {
                const typeInfo = EMAIL_TEMPLATE_TYPES.find((t) => t.value === template.type);
                return (
                  <div
                    key={template.id}
                    className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{template.name}</h3>
                          {template.isActive ? (
                            <span className="px-1.5 py-0.5 text-xs bg-success/10 text-success rounded">Active</span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">Inactive</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{typeInfo?.label || template.type}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: "Delete Email Template",
                              description: "This will permanently delete this email template. If this template is used in active automations, those automations will fail to send emails. This action cannot be undone.",
                              confirmLabel: "Delete Template",
                              variant: "destructive",
                            });

                            if (confirmed) {
                              deleteEmailTemplateMutation.mutate({ id: template.id });
                            }
                          }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground truncate">Subject: {template.subject}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No email templates yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create email templates to customize your communications.
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setEditingTemplate(null);
                  setShowTemplateModal(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* SMS Templates Tab */}
      {activeTab === "sms-templates" && (
        <div className="space-y-4">
          {smsTemplatesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : smsTemplates && smsTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {smsTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{template.name}</h3>
                        {template.isActive ? (
                          <span className="px-1.5 py-0.5 text-xs bg-success/10 text-success rounded">Active</span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{template.type}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{template.content.length}/160 characters</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No SMS templates yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                SMS templates will be available once Twilio integration is configured.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Automations Tab */}
      {activeTab === "automations" && (
        <div className="space-y-4">
          {automationsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Booking Automations */}
              <div className="bg-card rounded-lg border border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium text-foreground">Booking Automations</h3>
                  <p className="text-sm text-muted-foreground">Automated emails for booking lifecycle events</p>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { type: "booking_confirmation", label: "Booking Confirmation", description: "Send when booking is confirmed", timing: "Immediately" },
                    { type: "booking_reminder", label: "Booking Reminder (24h)", description: "Send 24 hours before tour", timing: "24h before" },
                    { type: "booking_reminder_2", label: "Booking Reminder (1h)", description: "Send 1 hour before tour", timing: "1h before" },
                    { type: "review_request", label: "Review Request", description: "Send after tour completion", timing: "24h after" },
                  ].map((automation) => {
                    const existing = automations?.find((a) => a.automationType === automation.type);
                    return (
                      <div key={automation.type} className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{automation.label}</p>
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">{automation.timing}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{automation.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={existing?.isActive ?? false}
                            onChange={(e) => toggleAutomationMutation.mutate({
                              type: automation.type as "booking_confirmation" | "booking_reminder" | "booking_reminder_2" | "review_request",
                              isActive: e.target.checked,
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cart Recovery Automations */}
              <div className="bg-card rounded-lg border border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium text-foreground">Cart Recovery</h3>
                  <p className="text-sm text-muted-foreground">Recover abandoned carts with automated reminders</p>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { type: "abandoned_cart_1", label: "Abandoned Cart - Email 1", description: "First reminder email", timing: "15 min after" },
                    { type: "abandoned_cart_2", label: "Abandoned Cart - Email 2", description: "Second reminder with incentive", timing: "24h after" },
                    { type: "abandoned_cart_3", label: "Abandoned Cart - Email 3", description: "Final reminder", timing: "72h after" },
                  ].map((automation) => {
                    const existing = automations?.find((a) => a.automationType === automation.type);
                    return (
                      <div key={automation.type} className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{automation.label}</p>
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">{automation.timing}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{automation.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={existing?.isActive ?? false}
                            onChange={(e) => toggleAutomationMutation.mutate({
                              type: automation.type as "abandoned_cart_1" | "abandoned_cart_2" | "abandoned_cart_3",
                              isActive: e.target.checked,
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Engagement Automations */}
              <div className="bg-card rounded-lg border border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium text-foreground">Customer Engagement</h3>
                  <p className="text-sm text-muted-foreground">Automated alerts and notifications</p>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { type: "price_drop_alert", label: "Price Drop Alert", description: "Notify wishlist customers of price drops", timing: "When price drops" },
                    { type: "availability_alert", label: "Availability Alert", description: "Notify customers when spots open", timing: "When available" },
                    { type: "wishlist_digest", label: "Wishlist Digest", description: "Weekly summary of wishlisted tours", timing: "Weekly" },
                  ].map((automation) => {
                    const existing = automations?.find((a) => a.automationType === automation.type);
                    return (
                      <div key={automation.type} className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{automation.label}</p>
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">{automation.timing}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{automation.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={existing?.isActive ?? false}
                            onChange={(e) => toggleAutomationMutation.mutate({
                              type: automation.type as "price_drop_alert" | "availability_alert" | "wishlist_digest",
                              isActive: e.target.checked,
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingTemplate ? "Edit Email Template" : "Create Email Template"}
              </h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Booking Confirmation Email"
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Template Type *
                  </label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                    disabled={!!editingTemplate}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted"
                  >
                    {EMAIL_TEMPLATE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {EMAIL_TEMPLATE_TYPES.find((t) => t.value === templateForm.type)?.description}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Brief description of this template"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g., Your booking {{booking_reference}} is confirmed!"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-foreground">
                    Email Content (HTML) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </button>
                </div>
                <div className={showPreview ? "grid grid-cols-2 gap-4" : ""}>
                  <textarea
                    value={templateForm.contentHtml}
                    onChange={(e) => setTemplateForm({ ...templateForm, contentHtml: e.target.value })}
                    rows={12}
                    placeholder="<h1>Hello {{customer_first_name}}!</h1>&#10;&#10;<p>Your booking has been confirmed.</p>"
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                  />
                  {showPreview && (
                    <div className="border border-border rounded-lg p-4 bg-muted overflow-auto">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: templateForm.contentHtml
                            .replace(/\{\{customer_name\}\}/g, "John Doe")
                            .replace(/\{\{customer_first_name\}\}/g, "John")
                            .replace(/\{\{tour_name\}\}/g, "Amazing City Tour")
                            .replace(/\{\{tour_date\}\}/g, "December 25, 2024")
                            .replace(/\{\{tour_time\}\}/g, "10:00 AM")
                            .replace(/\{\{booking_reference\}\}/g, "BK-123456")
                            .replace(/\{\{booking_total\}\}/g, "$150.00")
                            .replace(/\{\{participants\}\}/g, "2")
                            .replace(/\{\{organization_name\}\}/g, "Your Company"),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Available Variables */}
              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Available Variables</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      onClick={() => {
                        setTemplateForm({
                          ...templateForm,
                          contentHtml: templateForm.contentHtml + variable.name,
                        });
                      }}
                      className="text-left p-2 rounded hover:bg-muted transition-colors"
                    >
                      <code className="text-xs text-primary">{variable.name}</code>
                      <p className="text-xs text-muted-foreground mt-0.5">{variable.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={templateForm.isActive}
                  onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="isActive" className="text-sm text-foreground">
                  Template is active and will be used for automated emails
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-muted border-t border-border p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={createEmailTemplateMutation.isPending || updateEmailTemplateMutation.isPending || !templateForm.name || !templateForm.subject || !templateForm.contentHtml}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {(createEmailTemplateMutation.isPending || updateEmailTemplateMutation.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingTemplate ? "Update Template" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmModal}
    </div>
  );
}
