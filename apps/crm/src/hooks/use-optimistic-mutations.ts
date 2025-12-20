/**
 * Optimistic Mutation Hooks
 *
 * These hooks wrap tRPC mutations with optimistic update logic
 * to make the UI feel instant. The pattern:
 *
 * 1. onMutate: Cancel refetches, snapshot data, optimistically update
 * 2. onError: Rollback to snapshot, show error toast
 * 3. onSettled: Invalidate queries to sync with server
 *
 * Visual feedback: Optimistic items have `_optimistic: true` flag
 * for styling with reduced opacity or loading indicators.
 */

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ============================================
// Types for Optimistic Updates
// ============================================

export interface OptimisticItem {
  _optimistic?: boolean;
  _optimisticId?: string;
}

// Type for tour with schedule stats (matches the API response)
export interface TourWithScheduleStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  durationMinutes: number;
  minParticipants: number | null;
  maxParticipants: number;
  basePrice: string;
  currency: string | null;
  meetingPoint: string | null;
  meetingPointDetails: string | null;
  meetingPointLat: string | null;
  meetingPointLng: string | null;
  coverImageUrl: string | null;
  images: string[] | null;
  category: string | null;
  tags: string[] | null;
  includes: string[] | null;
  excludes: string[] | null;
  requirements: string[] | null;
  accessibility: string | null;
  cancellationPolicy: string | null;
  cancellationHours: number | null;
  minimumNoticeHours: number | null;
  maximumAdvanceDays: number | null;
  allowSameDayBooking: boolean | null;
  sameDayCutoffTime: string | null;
  depositEnabled: boolean | null;
  depositType: "percentage" | "fixed" | null;
  depositAmount: string | null;
  balanceDueDays: number | null;
  status: "draft" | "active" | "paused" | "archived";
  isPublic: boolean | null;
  metaTitle: string | null;
  metaDescription: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  scheduleStats: {
    upcomingCount: number;
    totalCapacity: number;
    totalBooked: number;
    utilizationPercent: number;
    nextScheduleDate: Date | null;
  };
  _optimistic?: boolean;
}

// ============================================
// Tour Optimistic Mutations
// ============================================

/**
 * Hook for tour mutations with optimistic updates
 */
export function useTourOptimisticMutations() {
  const utils = trpc.useUtils();

  // ----------------------------------------
  // Delete Tour with Optimistic Update
  // ----------------------------------------
  const deleteTour = trpc.tour.delete.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.tour.listWithScheduleStats.cancel();
      await utils.tour.list.cancel();
      await utils.tour.getStats.cancel();

      return { tourId: id };
    },
    onError: (err) => {
      toast.error(`Failed to delete tour: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Tour deleted successfully");
    },
    onSettled: () => {
      // Sync with server
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      utils.tour.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Archive Tour with Optimistic Update
  // ----------------------------------------
  const archiveTour = trpc.tour.archive.useMutation({
    onMutate: async ({ id }) => {
      await utils.tour.listWithScheduleStats.cancel();
      await utils.tour.list.cancel();
      await utils.tour.getStats.cancel();
      return { tourId: id };
    },
    onError: (err) => {
      toast.error(`Failed to archive tour: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Tour archived successfully");
    },
    onSettled: () => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      utils.tour.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Publish Tour with Optimistic Update
  // ----------------------------------------
  const publishTour = trpc.tour.publish.useMutation({
    onMutate: async ({ id }) => {
      await utils.tour.listWithScheduleStats.cancel();
      await utils.tour.list.cancel();
      await utils.tour.getStats.cancel();
      return { tourId: id };
    },
    onError: (err) => {
      toast.error(`Failed to publish tour: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Tour published successfully");
    },
    onSettled: () => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      utils.tour.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Duplicate Tour with Optimistic Update
  // ----------------------------------------
  const duplicateTour = trpc.tour.duplicate.useMutation({
    onMutate: async ({ id }) => {
      await utils.tour.listWithScheduleStats.cancel();
      await utils.tour.list.cancel();
      await utils.tour.getStats.cancel();
      return { tourId: id };
    },
    onError: (err) => {
      toast.error(`Failed to duplicate tour: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Tour duplicated successfully");
    },
    onSettled: () => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      utils.tour.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Create Tour
  // ----------------------------------------
  const createTour = trpc.tour.create.useMutation({
    onError: (err) => {
      toast.error(`Failed to create tour: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Tour created successfully");
    },
    onSettled: () => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      utils.tour.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Update Tour
  // ----------------------------------------
  const updateTour = trpc.tour.update.useMutation({
    onError: (err) => {
      toast.error(`Failed to update tour: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Tour updated successfully");
    },
    onSettled: (_data, _error, { id }) => {
      utils.tour.listWithScheduleStats.invalidate();
      utils.tour.list.invalidate();
      utils.tour.getById.invalidate({ id });
    },
  });

  return {
    createTour,
    updateTour,
    deleteTour,
    archiveTour,
    publishTour,
    duplicateTour,
  };
}

// ============================================
// Booking Optimistic Mutations
// ============================================

// Type for booking in list
export interface BookingListItem {
  id: string;
  referenceNumber: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  paymentStatus: "pending" | "partial" | "paid" | "refunded" | "failed";
  totalParticipants: number;
  total: string;
  paidAmount: string | null;
  currency: string;
  createdAt: Date;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  tour: {
    id: string;
    name: string;
  } | null;
  schedule: {
    id: string;
    startsAt: Date;
  } | null;
  _optimistic?: boolean;
}

/**
 * Hook for booking mutations with optimistic updates
 */
export function useBookingOptimisticMutations() {
  const utils = trpc.useUtils();

  // ----------------------------------------
  // Confirm Booking with Optimistic Update
  // ----------------------------------------
  const confirmBooking = trpc.booking.confirm.useMutation({
    onMutate: async ({ id }) => {
      await utils.booking.list.cancel();
      await utils.booking.getById.cancel({ id });
      await utils.booking.getStats.cancel();
      return { bookingId: id };
    },
    onError: (err) => {
      toast.error(`Failed to confirm booking: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Booking confirmed successfully");
    },
    onSettled: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Cancel Booking with Optimistic Update
  // ----------------------------------------
  const cancelBooking = trpc.booking.cancel.useMutation({
    onMutate: async ({ id }) => {
      await utils.booking.list.cancel();
      await utils.booking.getById.cancel({ id });
      await utils.booking.getStats.cancel();
      return { bookingId: id };
    },
    onError: (err) => {
      toast.error(`Failed to cancel booking: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
    },
    onSettled: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Mark No Show with Optimistic Update
  // ----------------------------------------
  const markNoShow = trpc.booking.markNoShow.useMutation({
    onMutate: async ({ id }) => {
      await utils.booking.list.cancel();
      await utils.booking.getStats.cancel();
      return { bookingId: id };
    },
    onError: (err) => {
      toast.error(`Failed to mark as no-show: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Booking marked as no-show");
    },
    onSettled: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Complete Booking with Optimistic Update
  // ----------------------------------------
  const completeBooking = trpc.booking.complete.useMutation({
    onMutate: async ({ id }) => {
      await utils.booking.list.cancel();
      await utils.booking.getStats.cancel();
      return { bookingId: id };
    },
    onError: (err) => {
      toast.error(`Failed to complete booking: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Booking marked as completed");
    },
    onSettled: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Update Payment Status with Optimistic Update
  // ----------------------------------------
  const updatePaymentStatus = trpc.booking.updatePaymentStatus.useMutation({
    onMutate: async ({ id }) => {
      await utils.booking.list.cancel();
      await utils.booking.getStats.cancel();
      return { bookingId: id };
    },
    onError: (err) => {
      toast.error(`Failed to update payment status: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Payment status updated");
    },
    onSettled: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Bulk Confirm with Optimistic Update
  // ----------------------------------------
  const bulkConfirm = trpc.booking.bulkConfirm.useMutation({
    onMutate: async ({ ids }) => {
      await utils.booking.list.cancel();
      await utils.booking.getStats.cancel();
      return { bookingIds: ids };
    },
    onError: (err) => {
      toast.error(`Bulk confirm failed: ${err.message}`);
    },
    onSuccess: (result) => {
      if (result.errors.length === 0) {
        toast.success(`${result.confirmed.length} bookings confirmed`);
      } else {
        toast.warning(`${result.confirmed.length} confirmed, ${result.errors.length} failed`);
      }
    },
    onSettled: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Bulk Cancel with Optimistic Update
  // ----------------------------------------
  const bulkCancel = trpc.booking.bulkCancel.useMutation({
    onMutate: async ({ ids }) => {
      await utils.booking.list.cancel();
      await utils.booking.getStats.cancel();
      return { bookingIds: ids };
    },
    onError: (err) => {
      toast.error(`Bulk cancel failed: ${err.message}`);
    },
    onSuccess: (result) => {
      if (result.errors.length === 0) {
        toast.success(`${result.cancelled.length} bookings cancelled`);
      } else {
        toast.warning(`${result.cancelled.length} cancelled, ${result.errors.length} failed`);
      }
    },
    onSettled: () => {
      utils.booking.list.invalidate();
      utils.booking.getStats.invalidate();
    },
  });

  return {
    confirmBooking,
    cancelBooking,
    markNoShow,
    completeBooking,
    updatePaymentStatus,
    bulkConfirm,
    bulkCancel,
  };
}

// ============================================
// Customer Optimistic Mutations
// ============================================

// Type for customer in list
export interface CustomerListItem {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  contactPreference: "email" | "phone" | "both";
  country: string | null;
  language: string | null;
  tags: string[] | null;
  source: "manual" | "website" | "api" | "import" | "referral" | null;
  createdAt: Date;
  updatedAt: Date;
  _optimistic?: boolean;
}

/**
 * Hook for customer mutations with optimistic updates
 */
export function useCustomerOptimisticMutations() {
  const utils = trpc.useUtils();

  // ----------------------------------------
  // Create Customer
  // ----------------------------------------
  const createCustomer = trpc.customer.create.useMutation({
    onError: (err) => {
      toast.error(`Failed to create customer: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Customer created successfully");
    },
    onSettled: () => {
      utils.customer.list.invalidate();
      utils.customer.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Update Customer
  // ----------------------------------------
  const updateCustomer = trpc.customer.update.useMutation({
    onError: (err) => {
      toast.error(`Failed to update customer: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Customer updated successfully");
    },
    onSettled: (_data, _error, { id }) => {
      utils.customer.list.invalidate();
      utils.customer.getById.invalidate({ id });
    },
  });

  // ----------------------------------------
  // Delete Customer
  // ----------------------------------------
  const deleteCustomer = trpc.customer.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.customer.list.cancel();
      await utils.customer.getStats.cancel();
      return { customerId: id };
    },
    onError: (err) => {
      toast.error(`Failed to delete customer: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Customer deleted successfully");
    },
    onSettled: () => {
      utils.customer.list.invalidate();
      utils.customer.getStats.invalidate();
    },
  });

  // ----------------------------------------
  // Add Tags
  // ----------------------------------------
  const addTags = trpc.customer.addTags.useMutation({
    onError: (err) => {
      toast.error(`Failed to add tags: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Tags added successfully");
    },
    onSettled: (_data, _error, { id }) => {
      utils.customer.list.invalidate();
      utils.customer.getById.invalidate({ id });
    },
  });

  // ----------------------------------------
  // Remove Tags
  // ----------------------------------------
  const removeTags = trpc.customer.removeTags.useMutation({
    onError: (err) => {
      toast.error(`Failed to remove tags: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Tags removed successfully");
    },
    onSettled: (_data, _error, { id }) => {
      utils.customer.list.invalidate();
      utils.customer.getById.invalidate({ id });
    },
  });

  return {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addTags,
    removeTags,
  };
}

// ============================================
// Guide Optimistic Mutations
// ============================================

/**
 * Hook for guide mutations with optimistic updates
 */
export function useGuideOptimisticMutations() {
  const utils = trpc.useUtils();

  const deleteGuide = trpc.guide.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.guide.list.cancel();
      await utils.guide.getStats.cancel();
      return { guideId: id };
    },
    onError: (err) => {
      toast.error(`Failed to delete guide: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Guide deleted successfully");
    },
    onSettled: () => {
      utils.guide.list.invalidate();
      utils.guide.getStats.invalidate();
    },
  });

  return {
    deleteGuide,
  };
}
