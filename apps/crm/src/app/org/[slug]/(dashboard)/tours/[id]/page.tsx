"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { LayoutDashboard, FileText, DollarSign } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TourPageHeader } from "@/components/tours/tour-page-header";
import { TourOverviewTab } from "@/components/tours/tour-overview-tab";
import { TourDetailsTab } from "@/components/tours/tour-details-tab";
import { TourBookingOptionsTab } from "@/components/tours/tour-booking-options-tab";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

type TabValue = "overview" | "details" | "pricing";

export default function TourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tourId = params.id as string;

  // Get initial tab from URL or default to overview
  const initialTab = (searchParams.get("tab") as TabValue) || "overview";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  // Confirmation modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const utils = trpc.useUtils();
  const { data: tour, isLoading, error } = trpc.tour.getById.useQuery({ id: tourId });

  // Mutations for tour actions
  const publishMutation = trpc.tour.publish.useMutation({
    onSuccess: () => {
      utils.tour.getById.invalidate({ id: tourId });
      utils.tour.list.invalidate();
      toast.success("Tour published");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish tour");
    },
  });

  const unpublishMutation = trpc.tour.unpublish.useMutation({
    onSuccess: () => {
      utils.tour.getById.invalidate({ id: tourId });
      utils.tour.list.invalidate();
      toast.success("Tour paused");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to pause tour");
    },
  });

  const archiveMutation = trpc.tour.archive.useMutation({
    onSuccess: () => {
      utils.tour.getById.invalidate({ id: tourId });
      utils.tour.list.invalidate();
      setShowArchiveModal(false);
      toast.success("Tour archived");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive tour");
    },
  });

  const deleteMutation = trpc.tour.delete.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      toast.success("Tour deleted");
      router.push(`/org/${slug}/tours`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete tour");
    },
  });

  const duplicateMutation = trpc.tour.duplicate.useMutation({
    onSuccess: (newTour) => {
      utils.tour.list.invalidate();
      toast.success("Tour duplicated");
      router.push(`/org/${slug}/tours/${newTour.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to duplicate tour");
    },
  });

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as TabValue;
    setActiveTab(newTab);
    const url = new URL(window.location.href);
    if (newTab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", newTab);
    }
    router.replace((url.pathname + url.search) as Route, { scroll: false });
  };

  // Handle details tab save
  const handleDetailsSave = () => {
    utils.tour.getById.invalidate({ id: tourId });
    setActiveTab("overview");
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    router.replace((url.pathname + url.search) as Route, { scroll: false });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Error loading tour: {error.message}</p>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Tour not found</p>
      </div>
    );
  }

  const isActionLoading =
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    archiveMutation.isPending ||
    deleteMutation.isPending ||
    duplicateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <TourPageHeader
        tour={{
          id: tour.id,
          name: tour.name,
          slug: tour.slug,
          status: tour.status,
          productId: tour.productId,
        }}
        orgSlug={slug}
        onPublish={() => publishMutation.mutate({ id: tourId })}
        onUnpublish={() => unpublishMutation.mutate({ id: tourId })}
        onArchive={() => setShowArchiveModal(true)}
        onDuplicate={() => duplicateMutation.mutate({ id: tourId })}
        onDelete={() => setShowDeleteModal(true)}
        isLoading={isActionLoading}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger
            value="pricing"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <DollarSign className="h-4 w-4" />
            Pricing & Options
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <TourOverviewTab tour={tour} />
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <TourDetailsTab
            tourId={tourId}
            tour={tour}
            onSuccess={handleDetailsSave}
          />
        </TabsContent>

        {/* Pricing & Options Tab */}
        <TabsContent value="pricing">
          <TourBookingOptionsTab tourId={tourId} />
        </TabsContent>
      </Tabs>

      {/* Archive Confirmation Modal */}
      <ConfirmModal
        open={showArchiveModal}
        onOpenChange={setShowArchiveModal}
        title="Archive Tour"
        description="Are you sure you want to archive this tour? Archived tours are hidden from the tour list but can be restored later."
        confirmLabel="Archive"
        variant="default"
        onConfirm={() => archiveMutation.mutate({ id: tourId })}
        isLoading={archiveMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Tour"
        description="Are you sure you want to delete this tour? This action cannot be undone. All associated schedules and bookings will also be affected."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate({ id: tourId })}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
