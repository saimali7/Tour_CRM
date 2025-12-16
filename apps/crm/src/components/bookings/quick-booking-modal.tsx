"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  Plus,
  Minus,
  User,
  Calendar,
  Users,
  CreditCard,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCustomerId?: string;
  preselectedScheduleId?: string;
}

type PaymentMethod = "cash" | "card" | "bank_transfer" | "check" | "other";

export function QuickBookingModal({
  open,
  onOpenChange,
  preselectedCustomerId,
  preselectedScheduleId,
}: QuickBookingModalProps) {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Form state
  const [customerId, setCustomerId] = useState(preselectedCustomerId || "");
  const [scheduleId, setScheduleId] = useState(preselectedScheduleId || "");
  const [tourId, setTourId] = useState("");
  const [adultCount, setAdultCount] = useState(2);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [specialRequests, setSpecialRequests] = useState("");

  // Quick create customer
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickFirstName, setQuickFirstName] = useState("");
  const [quickLastName, setQuickLastName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");

  // Data queries
  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  const { data: customersData, isLoading: customersLoading } = trpc.customer.list.useQuery({
    pagination: { page: 1, limit: 500 },
  });

  // Fetch schedules for selected tour in the next 30 days
  const { data: schedulesData } = trpc.schedule.list.useQuery(
    {
      pagination: { page: 1, limit: 100 },
      filters: {
        tourId: tourId || undefined,
        status: "scheduled",
        dateRange: {
          from: startOfDay(new Date()),
          to: endOfDay(addDays(new Date(), 30)),
        },
      },
      sort: { field: "startsAt", direction: "asc" },
    },
    { enabled: !!tourId }
  );

  // Get selected schedule details
  const selectedSchedule = useMemo(() => {
    return schedulesData?.data.find((s) => s.id === scheduleId);
  }, [schedulesData?.data, scheduleId]);

  // Fetch pricing tiers
  const { data: pricingTiers } = trpc.tour.listPricingTiers.useQuery(
    { tourId: selectedSchedule?.tour?.id || tourId },
    { enabled: !!(selectedSchedule?.tour?.id || tourId) }
  );

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedSchedule) return null;

    const basePrice = parseFloat(selectedSchedule.price || selectedSchedule.tour?.basePrice || "0");
    const adultTier = pricingTiers?.find(t => t.name === "adult");
    const childTier = pricingTiers?.find(t => t.name === "child");
    const infantTier = pricingTiers?.find(t => t.name === "infant");

    const adultPrice = adultTier?.price ? parseFloat(adultTier.price) : basePrice;
    const childPrice = childTier?.price ? parseFloat(childTier.price) : basePrice * 0.5;
    const infantPrice = infantTier?.price ? parseFloat(infantTier.price) : 0;

    const subtotal = adultPrice * adultCount + childPrice * childCount + infantPrice * infantCount;

    return {
      adultPrice,
      childPrice,
      infantPrice,
      subtotal,
      total: subtotal,
      currency: selectedSchedule.currency || "USD",
    };
  }, [selectedSchedule, pricingTiers, adultCount, childCount, infantCount]);

  // Set payment amount when pricing changes
  useEffect(() => {
    if (pricing && recordPayment) {
      setPaymentAmount(pricing.total.toFixed(2));
    }
  }, [pricing, recordPayment]);

  // Mutations
  const utils = trpc.useUtils();

  const createCustomerMutation = trpc.customer.create.useMutation({
    onSuccess: (customer) => {
      setCustomerId(customer.id);
      setShowQuickCreate(false);
      setQuickFirstName("");
      setQuickLastName("");
      setQuickEmail("");
      setQuickPhone("");
      utils.customer.list.invalidate();
      toast.success(`Customer ${customer.firstName} ${customer.lastName} created`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createBookingMutation = trpc.booking.create.useMutation({
    onSuccess: async (booking) => {
      // Record payment if requested
      if (recordPayment && paymentAmount && parseFloat(paymentAmount) > 0) {
        try {
          await recordPaymentMutation.mutateAsync({
            bookingId: booking.id,
            amount: paymentAmount,
            method: paymentMethod,
          });
        } catch {
          toast.error("Booking created but payment recording failed");
        }
      }

      utils.booking.list.invalidate();
      utils.schedule.list.invalidate();
      toast.success(`Booking ${booking.referenceNumber} created!`);
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const recordPaymentMutation = trpc.payment.create.useMutation();

  // Options for comboboxes
  const customerOptions: ComboboxOption[] = useMemo(() => {
    if (!customersData?.data) return [];
    return customersData.data.map((c) => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName}`,
      sublabel: c.email || c.phone || undefined,
    }));
  }, [customersData?.data]);

  const tourOptions: ComboboxOption[] = useMemo(() => {
    if (!toursData?.data) return [];
    return toursData.data.map((t) => ({
      value: t.id,
      label: t.name,
      sublabel: `$${t.basePrice}`,
    }));
  }, [toursData?.data]);

  const scheduleOptions: ComboboxOption[] = useMemo(() => {
    if (!schedulesData?.data) return [];
    return schedulesData.data.map((s) => {
      const available = s.maxParticipants - (s.bookedCount ?? 0);
      const isAvailable = available > 0;
      return {
        value: s.id,
        label: format(new Date(s.startsAt), "EEE, MMM d 'at' h:mm a"),
        sublabel: isAvailable ? `${available} spots left` : "Full",
        disabled: !isAvailable,
      };
    });
  }, [schedulesData?.data]);

  const resetForm = useCallback(() => {
    setCustomerId(preselectedCustomerId || "");
    setScheduleId(preselectedScheduleId || "");
    setTourId("");
    setAdultCount(2);
    setChildCount(0);
    setInfantCount(0);
    setRecordPayment(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setSpecialRequests("");
    setShowQuickCreate(false);
  }, [preselectedCustomerId, preselectedScheduleId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  // Keyboard shortcut: Cmd+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && open) {
        e.preventDefault();
        if (customerId && scheduleId && !createBookingMutation.isPending && !createCustomerMutation.isPending) {
          const form = document.querySelector('form[data-quick-booking-form]') as HTMLFormElement;
          if (form) {
            form.requestSubmit();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, customerId, scheduleId, createBookingMutation.isPending, createCustomerMutation.isPending]);

  // Handle quick create customer
  const handleQuickCreateCustomer = () => {
    if (!quickFirstName.trim() || !quickLastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    createCustomerMutation.mutate({
      firstName: quickFirstName.trim(),
      lastName: quickLastName.trim(),
      email: quickEmail.trim() || undefined,
      phone: quickPhone.trim() || undefined,
    });
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!scheduleId) {
      toast.error("Please select a tour and time");
      return;
    }

    // Validate capacity
    if (selectedSchedule) {
      const totalParticipants = adultCount + childCount + infantCount;
      const available = selectedSchedule.maxParticipants - (selectedSchedule.bookedCount ?? 0);
      if (totalParticipants > available) {
        toast.error(`Only ${available} spots available`);
        return;
      }
    }

    createBookingMutation.mutate({
      customerId,
      scheduleId,
      adultCount,
      childCount: childCount || undefined,
      infantCount: infantCount || undefined,
      subtotal: pricing?.subtotal.toFixed(2) || "0",
      total: pricing?.total.toFixed(2) || "0",
      specialRequests: specialRequests || undefined,
      source: "phone",
    });
  };

  const isSubmitting = createBookingMutation.isPending || createCustomerMutation.isPending;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: pricing?.currency || "USD",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Quick Booking
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" data-quick-booking-form>
          {/* Grid layout for main sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CUSTOMER SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Customer
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(!showQuickCreate)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>

              {showQuickCreate ? (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="First name *"
                      value={quickFirstName}
                      onChange={(e) => setQuickFirstName(e.target.value)}
                      className="px-3 py-2 text-sm border border-input rounded-md bg-background"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Last name *"
                      value={quickLastName}
                      onChange={(e) => setQuickLastName(e.target.value)}
                      className="px-3 py-2 text-sm border border-input rounded-md bg-background"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleQuickCreateCustomer}
                      disabled={createCustomerMutation.isPending}
                      className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      {createCustomerMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        "Create & Select"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickCreate(false)}
                      className="px-3 py-1.5 text-sm border border-input rounded-md hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <Combobox
                  options={customerOptions}
                  value={customerId}
                  onValueChange={setCustomerId}
                  placeholder="Search customer..."
                  searchPlaceholder="Type name or email..."
                  emptyText="No customers found"
                  isLoading={customersLoading}
                />
              )}

              {customerId && customersData?.data && (
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const customer = customersData.data.find(c => c.id === customerId);
                    return customer ? `${customer.email || ""} ${customer.phone || ""}`.trim() || "No contact info" : "";
                  })()}
                </div>
              )}
            </div>

            {/* TOUR & DATE SECTION */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Tour & Date
              </label>

              <Combobox
                options={tourOptions}
                value={tourId}
                onValueChange={(v) => {
                  setTourId(v);
                  setScheduleId(""); // Reset schedule when tour changes
                }}
                placeholder="Select tour..."
                searchPlaceholder="Search tours..."
                emptyText="No tours found"
              />

              {tourId && (
                <Combobox
                  options={scheduleOptions}
                  value={scheduleId}
                  onValueChange={setScheduleId}
                  placeholder="Select date & time..."
                  searchPlaceholder="Search schedules..."
                  emptyText={schedulesData?.data.length === 0 ? "No available schedules" : "Loading..."}
                />
              )}

              {/* Meeting point would be shown here if available */}
            </div>
          </div>

          {/* PARTICIPANTS SECTION */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Participants
            </label>

            <div className="grid grid-cols-3 gap-4">
              {/* Adults */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Adults {pricing && <span className="text-foreground">× {formatCurrency(pricing.adultPrice)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdultCount(Math.max(1, adultCount - 1))}
                    className="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent disabled:opacity-50"
                    disabled={adultCount <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{adultCount}</span>
                  <button
                    type="button"
                    onClick={() => setAdultCount(adultCount + 1)}
                    className="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Children {pricing && <span className="text-foreground">× {formatCurrency(pricing.childPrice)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChildCount(Math.max(0, childCount - 1))}
                    className="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent disabled:opacity-50"
                    disabled={childCount <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{childCount}</span>
                  <button
                    type="button"
                    onClick={() => setChildCount(childCount + 1)}
                    className="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Infants */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Infants {pricing && <span className="text-foreground">× {formatCurrency(pricing.infantPrice)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInfantCount(Math.max(0, infantCount - 1))}
                    className="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent disabled:opacity-50"
                    disabled={infantCount <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{infantCount}</span>
                  <button
                    type="button"
                    onClick={() => setInfantCount(infantCount + 1)}
                    className="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PRICING & PAYMENT SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pricing Summary */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total</span>
              </div>

              {pricing ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Adults × {adultCount}</span>
                    <span>{formatCurrency(pricing.adultPrice * adultCount)}</span>
                  </div>
                  {childCount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Children × {childCount}</span>
                      <span>{formatCurrency(pricing.childPrice * childCount)}</span>
                    </div>
                  )}
                  {infantCount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Infants × {infantCount}</span>
                      <span>{formatCurrency(pricing.infantPrice * infantCount)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-lg">{formatCurrency(pricing.total)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Select a tour and date to see pricing
                </div>
              )}
            </div>

            {/* Payment Recording */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordPayment}
                  onChange={(e) => setRecordPayment(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">Record payment now</span>
              </label>

              {recordPayment && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-sm border border-input rounded-md bg-background"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Method</label>
                    <div className="flex flex-wrap gap-2">
                      {(["cash", "card", "bank_transfer", "check"] as PaymentMethod[]).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={cn(
                            "px-3 py-1.5 text-xs rounded-md border transition-colors",
                            paymentMethod === method
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-input hover:bg-accent"
                          )}
                        >
                          {method.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Special Requests <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requirements or notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">Enter</kbd> to submit
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !customerId || !scheduleId}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use quick booking modal globally
export function useQuickBooking() {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>();
  const [preselectedScheduleId, setPreselectedScheduleId] = useState<string>();

  const openQuickBooking = useCallback((options?: { customerId?: string; scheduleId?: string }) => {
    setPreselectedCustomerId(options?.customerId);
    setPreselectedScheduleId(options?.scheduleId);
    setIsOpen(true);
  }, []);

  const closeQuickBooking = useCallback(() => {
    setIsOpen(false);
    setPreselectedCustomerId(undefined);
    setPreselectedScheduleId(undefined);
  }, []);

  return {
    isOpen,
    openQuickBooking,
    closeQuickBooking,
    preselectedCustomerId,
    preselectedScheduleId,
  };
}
