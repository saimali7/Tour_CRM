"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, X, Plus, ChevronDown, ChevronUp, Mail, Phone, MapPin, Tag, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CustomerFormProps {
  customer?: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    language: string | null;
    currency: string | null;
    notes: string | null;
    tags: string[] | null;
    source: string | null;
    sourceDetails: string | null;
  };
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isEditing = !!customer;

  const [formData, setFormData] = useState({
    email: customer?.email ?? "",
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    country: customer?.country ?? "",
    postalCode: customer?.postalCode ?? "",
    language: customer?.language ?? "",
    currency: customer?.currency ?? "",
    notes: customer?.notes ?? "",
    tags: customer?.tags ?? [],
    source: customer?.source ?? "manual",
    sourceDetails: customer?.sourceDetails ?? "",
  });

  // Collapsible sections - expand if editing and has data
  const [showAddress, setShowAddress] = useState(
    isEditing && !!(customer?.address || customer?.city || customer?.country)
  );
  const [showPreferences, setShowPreferences] = useState(
    isEditing && !!(customer?.language || customer?.currency)
  );
  const [showTags, setShowTags] = useState(
    isEditing && (customer?.tags?.length ?? 0) > 0
  );
  const [showNotes, setShowNotes] = useState(
    isEditing && !!customer?.notes
  );

  const [newTag, setNewTag] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate();
      toast.success("Customer created successfully");
      router.push(`/org/${slug}/customers`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });

  const updateMutation = trpc.customer.update.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate();
      utils.customer.getById.invalidate({ id: customer?.id });
      toast.success("Customer updated successfully");
      router.push(`/org/${slug}/customers`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update customer");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  // Validation: email OR phone required
  const hasValidContact = formData.email.trim() || formData.phone.trim();
  const canSubmit = formData.firstName.trim() && hasValidContact;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      toast.error("Please provide a name and at least email or phone");
      return;
    }

    const submitData = {
      email: formData.email.trim() || undefined,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim() || "-",
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      state: formData.state.trim() || undefined,
      country: formData.country.trim() || undefined,
      postalCode: formData.postalCode.trim() || undefined,
      language: formData.language || undefined,
      currency: formData.currency || undefined,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      source: formData.source as "manual" | "website" | "api" | "import" | "referral",
      sourceDetails: formData.sourceDetails.trim() || undefined,
    };

    if (isEditing && customer) {
      updateMutation.mutate({ id: customer.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  // Collapsible section component
  const CollapsibleSection = ({
    title,
    icon: Icon,
    isOpen,
    onToggle,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2 text-foreground">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="p-4 bg-card">{children}</div>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}

      {/* Essential Info - Always visible */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Customer Details</h2>
          <p className="text-sm text-muted-foreground mt-1">Name and contact information</p>
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="Smith (optional)"
            />
          </div>
        </div>

        {/* Contact - Email OR Phone */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Email or phone required (at least one)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className={cn(
                  "w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                  !hasValidContact ? "border-warning" : "border-input"
                )}
                placeholder="john@example.com"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className={cn(
                  "w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                  !hasValidContact ? "border-warning" : "border-input"
                )}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Optional Sections - Collapsible */}
      <div className="space-y-3">
        {/* Address */}
        <CollapsibleSection
          title="Address"
          icon={MapPin}
          isOpen={showAddress}
          onToggle={() => setShowAddress(!showAddress)}
        >
          <div className="space-y-4">
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Street address"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                className="px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="City"
              />
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                className="px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="State"
              />
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                className="px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Postal code"
              />
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                className="px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Country"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Preferences */}
        <CollapsibleSection
          title="Preferences"
          icon={FileText}
          isOpen={showPreferences}
          onToggle={() => setShowPreferences(!showPreferences)}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData((prev) => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select language</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select currency</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>

        {/* Tags */}
        <CollapsibleSection
          title="Tags"
          icon={Tag}
          isOpen={showTags}
          onToggle={() => setShowTags(!showTags)}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
                className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Notes */}
        <CollapsibleSection
          title="Internal Notes"
          icon={FileText}
          isOpen={showNotes}
          onToggle={() => setShowNotes(!showNotes)}
        >
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            placeholder="Internal notes about this customer..."
          />
        </CollapsibleSection>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Update Customer" : "Create Customer"}
        </button>
      </div>
    </form>
  );
}
