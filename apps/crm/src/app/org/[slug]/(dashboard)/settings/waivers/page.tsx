"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  Trash2,
  Edit2,
  ChevronLeft,
  ArrowLeft,
  AlertCircle,
  FileSignature,
  Heart,
  Calendar,
  Shield,
} from "lucide-react";
import { useConfirmModal } from "@/components/ui/confirm-modal";

export default function WaiversSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const { confirm, ConfirmModal } = useConfirmModal();

  const utils = trpc.useUtils();

  const { data: templates, isLoading } = trpc.waiver.listTemplates.useQuery({
    filters: { isActive: true },
    sortField: "createdAt",
    sortDirection: "desc",
  });

  const createMutation = trpc.waiver.createTemplate.useMutation({
    onSuccess: () => {
      utils.waiver.listTemplates.invalidate();
      setShowCreateModal(false);
      setFormData(initialFormData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const updateMutation = trpc.waiver.updateTemplate.useMutation({
    onSuccess: () => {
      utils.waiver.listTemplates.invalidate();
      setEditingTemplate(null);
      setFormData(initialFormData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const deleteMutation = trpc.waiver.deleteTemplate.useMutation({
    onSuccess: () => {
      utils.waiver.listTemplates.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const initialFormData = {
    name: "",
    description: "",
    content: "",
    requiresSignature: true,
    requiresInitials: false,
    requiresEmergencyContact: false,
    requiresDateOfBirth: false,
    requiresHealthInfo: false,
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleEdit = (template: NonNullable<typeof templates>[number]) => {
    setFormData({
      name: template.name,
      description: template.description || "",
      content: template.content,
      requiresSignature: template.requiresSignature,
      requiresInitials: template.requiresInitials || false,
      requiresEmergencyContact: template.requiresEmergencyContact || false,
      requiresDateOfBirth: template.requiresDateOfBirth || false,
      requiresHealthInfo: template.requiresHealthInfo || false,
    });
    setEditingTemplate(template.id);
    setShowCreateModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Delete Waiver Template",
      description: `Are you sure you want to delete "${name}"? This will remove it from all tours and cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/settings`}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Digital Waivers</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage waiver templates for your tours
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Saved successfully</span>
            </div>
          )}
          <button
            onClick={() => {
              setFormData(initialFormData);
              setEditingTemplate(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Waiver
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileSignature className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-600">About Digital Waivers</p>
            <p className="text-sm text-blue-600/80 mt-1">
              Digital waivers collect legally-binding signatures from customers before their tour.
              Customers can sign on their device and the signed waiver is stored with their booking.
              You can require waivers per tour and configure what information to collect.
            </p>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-card rounded-lg border border-border p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{template.name}</h3>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Requirements Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {template.requiresSignature && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                    <FileSignature className="h-3 w-3" />
                    Signature
                  </span>
                )}
                {template.requiresEmergencyContact && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Emergency Contact
                  </span>
                )}
                {template.requiresHealthInfo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                    <Heart className="h-3 w-3" />
                    Health Info
                  </span>
                )}
                {template.requiresDateOfBirth && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Date of Birth
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(template.id, template.name)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No waiver templates yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first waiver template to start collecting signatures from customers.
          </p>
          <button
            onClick={() => {
              setFormData(initialFormData);
              setEditingTemplate(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create First Waiver
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingTemplate ? "Edit Waiver Template" : "Create Waiver Template"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  setFormData(initialFormData);
                }}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <ChevronLeft className="h-5 w-5 rotate-90" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Waiver Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g., Standard Liability Waiver"
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Description (internal)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., For all adventure tours"
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Waiver Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                    required
                    rows={10}
                    placeholder="Enter the full text of your waiver. You can use markdown formatting..."
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Include clear language about liability, risks, and participant acknowledgments.
                  </p>
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Required Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.requiresSignature}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requiresSignature: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Require Signature</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.requiresInitials}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requiresInitials: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Require Initials</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.requiresEmergencyContact}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requiresEmergencyContact: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Emergency Contact</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.requiresDateOfBirth}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requiresDateOfBirth: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Date of Birth</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors md:col-span-2">
                    <input
                      type="checkbox"
                      checked={formData.requiresHealthInfo}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requiresHealthInfo: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        Health Information (allergies, medical conditions)
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTemplate(null);
                    setFormData(initialFormData);
                  }}
                  className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.content}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {editingTemplate ? "Save Changes" : "Create Waiver"}
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
