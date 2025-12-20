"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useOnboarding } from "@/providers/onboarding-provider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Map,
  Clock,
  Users,
  DollarSign,
  Tag,
  ArrowRight,
  Loader2,
  FileText,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface CreateTourStepProps {
  onComplete: () => void;
  onSkipStep: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const categories = [
  { value: "walking", label: "Walking Tour" },
  { value: "food", label: "Food & Culinary" },
  { value: "adventure", label: "Adventure" },
  { value: "cultural", label: "Cultural & Historical" },
  { value: "nature", label: "Nature & Wildlife" },
  { value: "water", label: "Water Activities" },
  { value: "photography", label: "Photography" },
  { value: "wine", label: "Wine & Spirits" },
  { value: "nightlife", label: "Nightlife" },
  { value: "private", label: "Private Tour" },
  { value: "other", label: "Other" },
];

const durations = [
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 150, label: "2.5 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 300, label: "5 hours" },
  { value: 360, label: "6 hours" },
  { value: 480, label: "8 hours (Full day)" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function CreateTourStep({
  onComplete,
  onSkipStep,
}: CreateTourStepProps) {
  const { setStepData, state } = useOnboarding();

  // Initialize form with existing data or defaults
  const [formData, setFormData] = useState({
    name: state.data.firstTour?.name ?? "",
    category: state.data.firstTour?.category ?? "",
    durationMinutes: state.data.firstTour?.durationMinutes ?? 120,
    basePrice: state.data.firstTour?.basePrice ?? "",
    maxParticipants: state.data.firstTour?.maxParticipants ?? 10,
    description: state.data.firstTour?.description ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Create tour mutation
  const createTour = trpc.tour.create.useMutation({
    onSuccess: (tour) => {
      toast.success("Tour created successfully");
      setStepData("firstTour", {
        ...formData,
        id: tour.id,
      });
      onComplete();
    },
    onError: (error) => {
      toast.error("Failed to create tour");
      setErrors({ submit: error.message });
    },
  });

  // Handle input changes
  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle blur for validation
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  // Field validation
  const validateField = (field: string): boolean => {
    const value = formData[field as keyof typeof formData];
    let error = "";

    switch (field) {
      case "name":
        if (!value || String(value).length < 3) {
          error = "Tour name must be at least 3 characters";
        }
        break;
      case "category":
        if (!value) {
          error = "Please select a category";
        }
        break;
      case "basePrice":
        if (!value) {
          error = "Price is required";
        } else if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
          error = "Please enter a valid price (e.g., 49.99)";
        } else if (parseFloat(String(value)) < 0) {
          error = "Price cannot be negative";
        }
        break;
      case "maxParticipants":
        if (!value || Number(value) < 1) {
          error = "Must have at least 1 participant";
        } else if (Number(value) > 100) {
          error = "Maximum 100 participants";
        }
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      return false;
    }
    return true;
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = "Tour name must be at least 3 characters";
    }

    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    if (!formData.basePrice) {
      newErrors.basePrice = "Price is required";
    } else if (!/^\d+(\.\d{1,2})?$/.test(formData.basePrice)) {
      newErrors.basePrice = "Please enter a valid price";
    }

    if (!formData.maxParticipants || formData.maxParticipants < 1) {
      newErrors.maxParticipants = "Must have at least 1 participant";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Create the tour
    await createTour.mutateAsync({
      name: formData.name,
      category: formData.category,
      durationMinutes: formData.durationMinutes,
      basePrice: formData.basePrice,
      maxParticipants: formData.maxParticipants,
      description: formData.description || undefined,
      status: "active",
      isPublic: true,
    });
  };

  // Check if form is complete
  const isFormComplete =
    formData.name.length >= 3 &&
    formData.category &&
    formData.basePrice &&
    formData.maxParticipants >= 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Friendly intro */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
          <Map className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Create your first tour experience. Don't worry about getting
          everything perfect - you can always edit and add more details later.
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Tour Name */}
        <FormField
          label="Tour Name"
          htmlFor="name"
          required
          error={touched.name ? errors.name : undefined}
        >
          <div className="relative">
            <Map className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="Historic Downtown Walking Tour"
              className="pl-10"
              error={touched.name && !!errors.name}
            />
          </div>
        </FormField>

        {/* Category & Duration row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <FormField
            label="Category"
            htmlFor="category"
            required
            error={touched.category ? errors.category : undefined}
          >
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange("category", value)}
              >
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormField>

          {/* Duration */}
          <FormField label="Duration" htmlFor="duration">
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <Select
                value={String(formData.durationMinutes)}
                onValueChange={(value) =>
                  handleChange("durationMinutes", parseInt(value))
                }
              >
                <SelectTrigger className="pl-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((dur) => (
                    <SelectItem key={dur.value} value={String(dur.value)}>
                      {dur.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormField>
        </div>

        {/* Price & Max Participants row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Price */}
          <FormField
            label="Price per Person"
            htmlFor="basePrice"
            required
            error={touched.basePrice ? errors.basePrice : undefined}
          >
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="basePrice"
                type="text"
                inputMode="decimal"
                value={formData.basePrice}
                onChange={(e) => handleChange("basePrice", e.target.value)}
                onBlur={() => handleBlur("basePrice")}
                placeholder="49.99"
                className="pl-10"
                error={touched.basePrice && !!errors.basePrice}
              />
            </div>
          </FormField>

          {/* Max Participants */}
          <FormField
            label="Max Guests"
            htmlFor="maxParticipants"
            required
            error={touched.maxParticipants ? errors.maxParticipants : undefined}
          >
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                max={100}
                value={formData.maxParticipants}
                onChange={(e) =>
                  handleChange("maxParticipants", parseInt(e.target.value) || 1)
                }
                onBlur={() => handleBlur("maxParticipants")}
                className="pl-10"
                error={touched.maxParticipants && !!errors.maxParticipants}
              />
            </div>
          </FormField>
        </div>

        {/* Description (optional) */}
        <FormField
          label="Description"
          htmlFor="description"
          optional
          hint="A brief description for your booking page"
        >
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Join us for an unforgettable journey through the historic downtown area..."
            rows={3}
            className="resize-none"
          />
        </FormField>
      </div>

      {/* Error message */}
      {errors.submit && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{errors.submit}</p>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={createTour.isPending || !isFormComplete}
          className="w-full h-11 gap-2 font-medium"
        >
          {createTour.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating tour...
            </>
          ) : (
            <>
              Create Tour & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
