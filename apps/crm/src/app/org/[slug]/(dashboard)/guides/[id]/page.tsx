"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { LayoutDashboard, FileText, Calendar } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GuidePageHeader } from "@/components/guides/guide-page-header";
import { GuideOverviewTab } from "@/components/guides/guide-overview-tab";
import { GuideDetailsTab } from "@/components/guides/guide-details-tab";
import { GuideAssignmentsTab } from "@/components/guides/guide-assignments-tab";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

type TabValue = "overview" | "details" | "assignments";

export default function GuideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const guideId = params.id as string;

  const initialTab = (searchParams.get("tab") as TabValue) || "overview";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const utils = trpc.useUtils();
  const { data: guide, isLoading, error } = trpc.guide.getByIdWithStats.useQuery({
    id: guideId,
  });

  const deleteMutation = trpc.guide.delete.useMutation({
    onSuccess: () => {
      utils.guide.list.invalidate();
      toast.success("Guide deleted");
      router.push(`/org/${slug}/guides` as Route);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete guide");
    },
  });

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

  const handleDetailsSave = () => {
    utils.guide.getByIdWithStats.invalidate({ id: guideId });
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
        <p className="text-destructive">Error loading guide: {error.message}</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Guide not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GuidePageHeader
        guide={{
          id: guide.id,
          firstName: guide.firstName,
          lastName: guide.lastName,
          avatarUrl: guide.avatarUrl,
          status: guide.status,
          createdAt: guide.createdAt,
        }}
        orgSlug={slug}
        onDelete={() => setShowDeleteModal(true)}
        isLoading={deleteMutation.isPending}
      />

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
            value="assignments"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4 py-3"
          >
            <Calendar className="h-4 w-4" />
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <GuideOverviewTab guide={guide} />
        </TabsContent>

        <TabsContent value="details">
          <GuideDetailsTab
            guideId={guideId}
            guide={guide}
            onSuccess={handleDetailsSave}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <GuideAssignmentsTab guideId={guideId} orgSlug={slug} />
        </TabsContent>
      </Tabs>

      <ConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Guide"
        description="Are you sure you want to delete this guide? This action cannot be undone. All associated assignments will also be removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate({ id: guideId })}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
