"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label, FormField } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { CatalogServiceWithProduct } from "@tour/services";

interface ServiceDetailsTabProps {
  serviceId: string;
  service: CatalogServiceWithProduct;
  onSuccess?: () => void;
}

interface ServiceFormData {
  // Product fields
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  basePrice: string;
  tags: string[];
  status: string;

  // Service fields
  serviceType: string;
  pricingModel: string;
  isStandalone: boolean;
  isAddon: boolean;
  requiresApproval: boolean;
  duration: number | null;
  maxQuantity: number | null;
  maxPerBooking: number | null;
}

const SERVICE_TYPES = [
  { value: "transfer", label: "Transfer" },
  { value: "addon", label: "Add-on" },
  { value: "rental", label: "Rental" },
  { value: "package", label: "Package" },
  { value: "custom", label: "Custom" },
];

const PRICING_MODELS = [
  { value: "flat", label: "Flat Rate" },
  { value: "per_person", label: "Per Person" },
  { value: "per_hour", label: "Per Hour" },
  { value: "per_day", label: "Per Day" },
  { value: "per_vehicle", label: "Per Vehicle" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export function ServiceDetailsTab({
  serviceId,
  service,
  onSuccess,
}: ServiceDetailsTabProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    // Product fields
    name: service.product.name,
    slug: service.product.slug,
    description: service.product.description ?? "",
    shortDescription: service.product.shortDescription ?? "",
    basePrice: service.product.basePrice,
    tags: service.product.tags ?? [],
    status: service.product.status,

    // Service fields
    serviceType: service.serviceType,
    pricingModel: service.pricingModel,
    isStandalone: service.isStandalone ?? true,
    isAddon: service.isAddon ?? true,
    requiresApproval: service.requiresApproval ?? false,
    duration: service.duration,
    maxQuantity: service.maxQuantity,
    maxPerBooking: service.maxPerBooking,
  });

  const utils = trpc.useUtils();

  const updateMutation = trpc.catalogService.update.useMutation({
    onSuccess: () => {
      utils.catalogService.list.invalidate();
      utils.catalogService.getById.invalidate({ id: serviceId });
      toast.success("Service updated successfully");
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update service");
    },
  });

  const isSubmitting = updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      // Product fields
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      shortDescription: formData.shortDescription || undefined,
      basePrice: formData.basePrice,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      status: formData.status as "draft" | "active" | "archived",

      // Service fields
      serviceType: formData.serviceType as "transfer" | "addon" | "rental" | "package" | "custom",
      pricingModel: formData.pricingModel as "flat" | "per_person" | "per_hour" | "per_day" | "per_vehicle" | "custom",
      isStandalone: formData.isStandalone,
      isAddon: formData.isAddon,
      requiresApproval: formData.requiresApproval,
      duration: formData.duration ?? undefined,
      maxQuantity: formData.maxQuantity ?? undefined,
      maxPerBooking: formData.maxPerBooking ?? undefined,
    };

    updateMutation.mutate({ id: serviceId, data: payload });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Auto-generate slug from name if slug is empty
      slug: !prev.slug ? generateSlug(name) : prev.slug,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {updateMutation.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {updateMutation.error.message}
          </p>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Service Name" htmlFor="name" required>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Airport Transfer"
            />
          </FormField>

          <FormField label="URL Slug" htmlFor="slug" required>
            <Input
              id="slug"
              type="text"
              required
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder="airport-transfer"
            />
          </FormField>
        </div>

        <FormField
          label="Short Description"
          htmlFor="short-description"
          hint={`${formData.shortDescription.length}/500 characters`}
        >
          <Input
            id="short-description"
            type="text"
            value={formData.shortDescription}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
            }
            placeholder="A brief description for listings"
            maxLength={500}
          />
        </FormField>

        <FormField label="Full Description" htmlFor="description">
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={4}
            placeholder="Detailed description of the service..."
          />
        </FormField>

        <FormField label="Status" htmlFor="status" required>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Pricing */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Pricing</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Base Price ($)" htmlFor="base-price" required>
            <Input
              id="base-price"
              type="text"
              required
              value={formData.basePrice}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, basePrice: e.target.value }))
              }
              placeholder="99.00"
            />
          </FormField>

          <FormField label="Pricing Model" htmlFor="pricing-model" required>
            <Select
              value={formData.pricingModel}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, pricingModel: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pricing model" />
              </SelectTrigger>
              <SelectContent>
                {PRICING_MODELS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Availability & Configuration */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">
          Availability & Configuration
        </h2>

        <FormField label="Service Type" htmlFor="service-type" required>
          <Select
            value={formData.serviceType}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, serviceType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select service type" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="Duration (minutes)"
            htmlFor="duration"
            hint="Leave empty if not applicable"
          >
            <Input
              id="duration"
              type="number"
              min="1"
              value={formData.duration ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  duration: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder="60"
            />
          </FormField>

          <FormField
            label="Max Quantity"
            htmlFor="max-quantity"
            hint="Maximum units available"
          >
            <Input
              id="max-quantity"
              type="number"
              min="1"
              value={formData.maxQuantity ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxQuantity: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder="10"
            />
          </FormField>

          <FormField
            label="Max Per Booking"
            htmlFor="max-per-booking"
            hint="Maximum per single booking"
          >
            <Input
              id="max-per-booking"
              type="number"
              min="1"
              value={formData.maxPerBooking ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxPerBooking: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder="10"
            />
          </FormField>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is-standalone">Standalone Service</Label>
              <p className="text-sm text-muted-foreground">
                Can be booked independently
              </p>
            </div>
            <Switch
              id="is-standalone"
              checked={formData.isStandalone}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isStandalone: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is-addon">Available as Add-on</Label>
              <p className="text-sm text-muted-foreground">
                Can be added to other products
              </p>
            </div>
            <Switch
              id="is-addon"
              checked={formData.isAddon}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isAddon: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="requires-approval">Requires Approval</Label>
              <p className="text-sm text-muted-foreground">
                Bookings need manual confirmation
              </p>
            </div>
            <Switch
              id="requires-approval"
              checked={formData.requiresApproval}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, requiresApproval: checked }))
              }
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}
