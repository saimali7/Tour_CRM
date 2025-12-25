"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { LayoutDashboard, FileText, DollarSign } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ServicePageHeader } from "@/components/services/service-page-header";
import { ServiceOverviewTab } from "@/components/services/service-overview-tab";
import { ServiceDetailsTab } from "@/components/services/service-details-tab";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

type TabValue = "overview" | "details" | "pricing";

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const serviceId = params.id as string;

  // Get initial tab from URL or default to overview
  const initialTab = (searchParams.get("tab") as TabValue) || "overview";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  // Confirmation modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const utils = trpc.useUtils();
  const { data: service, isLoading, error } = trpc.catalogService.getById.useQuery({ id: serviceId });

  // Mutations for service actions
  const archiveMutation = trpc.catalogService.archive.useMutation({
    onSuccess: () => {
      utils.catalogService.getById.invalidate({ id: serviceId });
      utils.catalogService.list.invalidate();
      setShowArchiveModal(false);
      toast.success("Service archived");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive service");
    },
  });

  const deleteMutation = trpc.catalogService.delete.useMutation({
    onSuccess: () => {
      utils.catalogService.list.invalidate();
      toast.success("Service deleted");
      router.push(`/org/${slug}/services`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete service");
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
    utils.catalogService.getById.invalidate({ id: serviceId });
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
        <p className="text-destructive">Error loading service: {error.message}</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Service not found</p>
      </div>
    );
  }

  const isActionLoading =
    archiveMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <ServicePageHeader
        service={{
          id: service.id,
          name: service.product.name,
          slug: service.product.slug,
          status: service.product.status as "draft" | "active" | "archived",
          serviceType: service.serviceType,
        }}
        orgSlug={slug}
        onArchive={() => setShowArchiveModal(true)}
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
            Pricing
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <ServiceOverviewTab service={service} />
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <ServiceDetailsTab
            serviceId={serviceId}
            service={service}
            onSuccess={handleDetailsSave}
          />
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Pricing Configuration</h2>
            <p className="text-muted-foreground">
              Advanced pricing configuration coming soon. For now, you can set the base price in the Details tab.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Archive Confirmation Modal */}
      <ConfirmModal
        open={showArchiveModal}
        onOpenChange={setShowArchiveModal}
        title="Archive Service"
        description="Are you sure you want to archive this service? Archived services are hidden from the service list but can be restored later."
        confirmLabel="Archive"
        variant="default"
        onConfirm={() => archiveMutation.mutate({ id: serviceId })}
        isLoading={archiveMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone. All associated bookings will also be affected."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate({ id: serviceId })}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
