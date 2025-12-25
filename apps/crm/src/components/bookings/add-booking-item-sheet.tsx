"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Search, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogServiceWithProduct } from "@tour/services";

// ============================================================================
// TYPES
// ============================================================================

interface AddBookingItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onSuccess?: () => void;
}

// ============================================================================
// SERVICE TYPE BADGE MAPPING
// ============================================================================

const SERVICE_TYPE_CONFIG = {
  transfer: { label: "Transfer", variant: "default" as const },
  addon: { label: "Add-on", variant: "secondary" as const },
  rental: { label: "Rental", variant: "outline" as const },
  package: { label: "Package", variant: "success" as const },
  custom: { label: "Custom", variant: "warning" as const },
};

const PRICING_MODEL_LABELS = {
  flat: "Flat Rate",
  per_person: "Per Person",
  per_hour: "Per Hour",
  per_day: "Per Day",
  per_vehicle: "Per Vehicle",
  custom: "Custom",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddBookingItemSheet({
  open,
  onOpenChange,
  bookingId,
  onSuccess,
}: AddBookingItemSheetProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [participants, setParticipants] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();

  // Query available services
  const { data: servicesData, isLoading: isLoadingServices } = trpc.catalogService.list.useQuery({
    filters: { status: "active" },
    pagination: { page: 1, limit: 100 },
  });

  // Get selected service details
  const selectedService = useMemo(() => {
    if (!selectedServiceId || !servicesData?.data) return null;
    return servicesData.data.find((s) => s.id === selectedServiceId);
  }, [selectedServiceId, servicesData]);

  // Filter services based on search
  const filteredServices = useMemo(() => {
    if (!servicesData?.data) return [];
    if (!searchQuery.trim()) return servicesData.data;

    const query = searchQuery.toLowerCase();
    return servicesData.data.filter(
      (service: CatalogServiceWithProduct) =>
        service.product.name.toLowerCase().includes(query) ||
        service.product.description?.toLowerCase().includes(query) ||
        service.serviceType.toLowerCase().includes(query)
    );
  }, [servicesData, searchQuery]);

  // Calculate pricing preview
  const pricingPreview = useMemo(() => {
    if (!selectedService) return null;

    const basePrice = parseFloat(selectedService.product.basePrice);
    let total = basePrice;

    // Apply pricing model
    if (selectedService.pricingModel === "per_person" && participants) {
      total = basePrice * participants * quantity;
    } else {
      total = basePrice * quantity;
    }

    return {
      basePrice: selectedService.product.basePrice,
      quantity,
      participants,
      total: total.toFixed(2),
    };
  }, [selectedService, quantity, participants]);

  // Add mutation
  const addMutation = trpc.bookingItem.add.useMutation({
    onSuccess: () => {
      toast.success("Service added to booking successfully");
      utils.bookingItem.listByBooking.invalidate({ bookingId });
      utils.bookingItem.calculateTotal.invalidate({ bookingId });

      // Reset form
      setSelectedServiceId(null);
      setQuantity(1);
      setParticipants(undefined);
      setSearchQuery("");

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add service to booking");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    addMutation.mutate({
      bookingId,
      productId: selectedService.productId,
      quantity,
      participants,
      unitPrice: selectedService.product.basePrice,
    });
  };

  const handleServiceSelect = (service: CatalogServiceWithProduct) => {
    setSelectedServiceId(service.id);

    // Reset participants based on pricing model
    if (service.pricingModel === "per_person") {
      setParticipants(1);
    } else {
      setParticipants(undefined);
    }
  };

  const isSubmitting = addMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Service to Booking</SheetTitle>
          <SheetDescription>
            Select a service or add-on to include in this booking
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Service Selection */}
          <div className="space-y-4">
            <Label>Select Service</Label>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Service List */}
            <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg">
              {isLoadingServices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No services found" : "No active services available"}
                  </p>
                </div>
              ) : (
                filteredServices.map((service: CatalogServiceWithProduct) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceSelect(service)}
                    className={cn(
                      "w-full text-left p-4 border-b last:border-b-0 transition-colors hover:bg-muted/50",
                      selectedServiceId === service.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm text-foreground truncate">
                            {service.product.name}
                          </p>
                          <Badge
                            variant={SERVICE_TYPE_CONFIG[service.serviceType as keyof typeof SERVICE_TYPE_CONFIG].variant}
                            className="shrink-0"
                          >
                            {SERVICE_TYPE_CONFIG[service.serviceType as keyof typeof SERVICE_TYPE_CONFIG].label}
                          </Badge>
                        </div>
                        {service.product.shortDescription && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            {service.product.shortDescription}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{PRICING_MODEL_LABELS[service.pricingModel as keyof typeof PRICING_MODEL_LABELS]}</span>
                          <span className="font-mono font-semibold text-foreground">
                            ${service.product.basePrice}
                          </span>
                        </div>
                      </div>
                      {selectedServiceId === service.id && (
                        <div className="shrink-0">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <svg
                              className="h-3 w-3 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Quantity & Participants */}
          {selectedService && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <h3 className="text-sm font-medium text-foreground">Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <FormField label="Quantity" htmlFor="quantity" required>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <span className="sr-only">Decrease quantity</span>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                    </Button>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <span className="sr-only">Increase quantity</span>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </FormField>

                {/* Participants (for per-person pricing) */}
                {selectedService.pricingModel === "per_person" && (
                  <FormField label="Participants" htmlFor="participants" required>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setParticipants(Math.max(1, (participants || 1) - 1))}
                        disabled={(participants || 1) <= 1}
                      >
                        <span className="sr-only">Decrease participants</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        </svg>
                      </Button>
                      <Input
                        id="participants"
                        type="number"
                        min="1"
                        value={participants || 1}
                        onChange={(e) => setParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setParticipants((participants || 1) + 1)}
                      >
                        <span className="sr-only">Increase participants</span>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormField>
                )}
              </div>

              {/* Pricing Preview */}
              {pricingPreview && (
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="font-mono">${pricingPreview.basePrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-mono">{pricingPreview.quantity}</span>
                  </div>
                  {pricingPreview.participants && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Participants</span>
                      <span className="font-mono">{pricingPreview.participants}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-base font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span className="font-mono">${pricingPreview.total}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {addMutation.error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                {addMutation.error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedService || isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add to Booking
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
