"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  MoreVertical,
  Loader2,
  Package,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface BookingItemsSectionProps {
  bookingId: string;
  isAdmin?: boolean;
}

interface BookingItemWithProduct {
  id: string;
  bookingId: string;
  productId: string;
  productType: "tour" | "service" | "good";
  productName: string;
  quantity: number;
  participants: number | null;
  unitPrice: string;
  subtotal: string;
  discountAmount: string;
  totalPrice: string;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  fulfilledAt: Date | null;
  product: { id: string; name: string; type: string; status: string };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function getProductTypeBadge(type: "tour" | "service" | "good") {
  const config = {
    tour: { label: "Tour", variant: "default" as const },
    service: { label: "Service", variant: "secondary" as const },
    good: { label: "Good", variant: "outline" as const },
  };
  return config[type];
}

function getStatusBadge(status: "pending" | "confirmed" | "fulfilled" | "cancelled") {
  const config = {
    pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    fulfilled: { label: "Fulfilled", className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
    cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  };
  return config[status];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingItemsSection({ bookingId, isAdmin = false }: BookingItemsSectionProps) {
  const [addServiceSheetOpen, setAddServiceSheetOpen] = React.useState(false);

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  const {
    data: items,
    isLoading,
    error,
  } = trpc.bookingItem.listByBooking.useQuery(
    { bookingId },
    { enabled: !!bookingId }
  );

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const utils = trpc.useUtils();

  const removeMutation = trpc.bookingItem.remove.useMutation({
    onSuccess: () => {
      toast.success("Item removed successfully");
      utils.bookingItem.listByBooking.invalidate({ bookingId });
    },
    onError: (error) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });

  const fulfillMutation = trpc.bookingItem.fulfill.useMutation({
    onSuccess: () => {
      toast.success("Item marked as fulfilled");
      utils.bookingItem.listByBooking.invalidate({ bookingId });
    },
    onError: (error) => {
      toast.error(`Failed to fulfill item: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleRemoveItem = React.useCallback(
    (itemId: string) => {
      if (confirm("Are you sure you want to remove this item?")) {
        removeMutation.mutate({ id: itemId });
      }
    },
    [removeMutation]
  );

  const handleFulfillItem = React.useCallback(
    (itemId: string) => {
      fulfillMutation.mutate({ id: itemId });
    },
    [fulfillMutation]
  );

  // ---------------------------------------------------------------------------
  // CALCULATIONS
  // ---------------------------------------------------------------------------

  const totals = React.useMemo(() => {
    if (!items || items.length === 0) {
      return { subtotal: 0, discount: 0, total: 0 };
    }

    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.subtotal),
      0
    );
    const discount = items.reduce(
      (sum, item) => sum + parseFloat(item.discountAmount || "0"),
      0
    );
    const total = items.reduce(
      (sum, item) => sum + parseFloat(item.totalPrice),
      0
    );

    return { subtotal, discount, total };
  }, [items]);

  // ---------------------------------------------------------------------------
  // RENDER STATES
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Failed to load booking items
        </p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const hasItems = items && items.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Booking Items</h2>
          <p className="text-sm text-muted-foreground">
            Services and products included in this booking
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setAddServiceSheetOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        )}
      </div>

      {/* Items Table */}
      {hasItems ? (
        <div className="border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Type
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Qty
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Participants
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Unit Price
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-card">
                {items.map((item) => {
                  const typeBadge = getProductTypeBadge(item.productType);
                  const statusBadge = getStatusBadge(item.status);

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground font-medium">
                            {item.productName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={typeBadge.variant} className="text-xs">
                          {typeBadge.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-foreground font-mono tabular-nums">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-foreground font-mono tabular-nums">
                          {item.participants || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-foreground font-mono tabular-nums">
                          {formatCurrency(item.unitPrice)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-foreground font-mono tabular-nums font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={cn("text-xs border", statusBadge.className)}
                        >
                          {statusBadge.label}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                aria-label="Item actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.status !== "fulfilled" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleFulfillItem(item.id)}
                                    disabled={fulfillMutation.isPending}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark as Fulfilled
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={removeMutation.isPending}
                                variant="destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals Footer */}
              <tfoot className="bg-muted/50 border-t-2 border-border">
                {totals.discount > 0 && (
                  <tr className="border-b border-border">
                    <td
                      colSpan={isAdmin ? 5 : 4}
                      className="py-2 px-4 text-right text-sm text-muted-foreground"
                    >
                      Subtotal
                    </td>
                    <td className="py-2 px-4 text-right text-sm text-foreground font-mono tabular-nums">
                      {formatCurrency(totals.subtotal)}
                    </td>
                    <td colSpan={isAdmin ? 2 : 1}></td>
                  </tr>
                )}
                {totals.discount > 0 && (
                  <tr className="border-b border-border">
                    <td
                      colSpan={isAdmin ? 5 : 4}
                      className="py-2 px-4 text-right text-sm text-muted-foreground"
                    >
                      Discount
                    </td>
                    <td className="py-2 px-4 text-right text-sm text-red-600 dark:text-red-400 font-mono tabular-nums">
                      -{formatCurrency(totals.discount)}
                    </td>
                    <td colSpan={isAdmin ? 2 : 1}></td>
                  </tr>
                )}
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    className="py-3 px-4 text-right text-sm font-semibold text-foreground"
                  >
                    Total
                  </td>
                  <td className="py-3 px-4 text-right text-base font-bold text-foreground font-mono tabular-nums">
                    {formatCurrency(totals.total)}
                  </td>
                  <td colSpan={isAdmin ? 2 : 1}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        // Empty State
        <div className="flex flex-col items-center justify-center py-12 border border-border border-dashed rounded-md bg-muted/20">
          <Package className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            No items added yet
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Add services or products to this booking
          </p>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddServiceSheetOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add First Item
            </Button>
          )}
        </div>
      )}

      {/* Add Service Sheet */}
      <Sheet open={addServiceSheetOpen} onOpenChange={setAddServiceSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Service</SheetTitle>
            <SheetDescription>
              Add a service or product to this booking
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <p className="text-sm text-muted-foreground">
              Service selection interface coming soon...
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
