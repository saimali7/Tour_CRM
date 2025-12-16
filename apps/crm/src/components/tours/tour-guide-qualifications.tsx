"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { UserCircle, Star, Trash2, UserPlus, CheckCircle, XCircle } from "lucide-react";

interface TourGuideQualificationsProps {
  tourId: string;
}

export function TourGuideQualifications({ tourId }: TourGuideQualificationsProps) {
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [guideToRemove, setGuideToRemove] = useState<{ id: string; name: string } | null>(null);

  const utils = trpc.useUtils();

  // Fetch qualified guides for this tour
  const { data: qualifications = [], isLoading: qualificationsLoading } =
    trpc.tourGuideQualification.getQualificationsForTour.useQuery(
      { tourId },
      { enabled: !!tourId }
    );

  // Fetch all guides for the dropdown
  const { data: allGuidesData } = trpc.guide.list.useQuery({
    filters: { status: "active" },
  });

  const allGuides = allGuidesData?.data || [];

  // Filter out already qualified guides
  const qualifiedGuideIds = new Set(qualifications.map((q) => q.guideId));
  const availableGuides = allGuides.filter((guide) => !qualifiedGuideIds.has(guide.id));

  // Mutations
  const addQualificationMutation = trpc.tourGuideQualification.addQualification.useMutation({
    onSuccess: () => {
      utils.tourGuideQualification.getQualificationsForTour.invalidate({ tourId });
      setSelectedGuideId("");
      setSetAsPrimary(false);
    },
  });

  const removeQualificationMutation = trpc.tourGuideQualification.removeQualification.useMutation({
    onSuccess: () => {
      utils.tourGuideQualification.getQualificationsForTour.invalidate({ tourId });
      setShowConfirmDialog(false);
      setGuideToRemove(null);
    },
  });

  const setPrimaryGuideMutation = trpc.tourGuideQualification.setPrimaryGuide.useMutation({
    onSuccess: () => {
      utils.tourGuideQualification.getQualificationsForTour.invalidate({ tourId });
    },
  });

  const handleAddGuide = () => {
    if (!selectedGuideId) return;

    addQualificationMutation.mutate({
      tourId,
      guideId: selectedGuideId,
      isPrimary: setAsPrimary,
    });
  };

  const handleRemoveGuide = (qualificationId: string, guideName: string) => {
    setGuideToRemove({ id: qualificationId, name: guideName });
    setShowConfirmDialog(true);
  };

  const confirmRemove = () => {
    if (!guideToRemove) return;
    removeQualificationMutation.mutate({ id: guideToRemove.id });
  };

  const handleSetPrimary = (guideId: string) => {
    setPrimaryGuideMutation.mutate({ tourId, guideId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "status-confirmed";
      case "inactive":
        return "bg-muted text-muted-foreground";
      case "on_leave":
        return "status-pending";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "on_leave":
        return "On Leave";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (qualificationsLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Qualified Guides</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage which guides are qualified to lead this tour
        </p>
      </div>

      {/* Qualified Guides List */}
      {qualifications.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg mb-6">
          <UserCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-1">No qualified guides yet</p>
          <p className="text-sm text-muted-foreground">
            Add guides who are qualified to lead this tour
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {qualifications.map((qualification) => (
            <div
              key={qualification.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                {qualification.guide.avatarUrl ? (
                  <img
                    src={qualification.guide.avatarUrl}
                    alt={`${qualification.guide.firstName} ${qualification.guide.lastName}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-medium text-sm">
                      {qualification.guide.firstName?.charAt(0) ?? ""}
                      {qualification.guide.lastName?.charAt(0) ?? ""}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {qualification.guide.firstName} {qualification.guide.lastName}
                    </span>
                    {qualification.isPrimary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium status-pending">
                        <Star className="h-3 w-3 fill-current" />
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        qualification.guide.status
                      )}`}
                    >
                      {getStatusLabel(qualification.guide.status)}
                    </span>
                    {qualification.guide.languages &&
                      qualification.guide.languages.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {qualification.guide.languages.map((lang) => lang.toUpperCase()).join(", ")}
                        </span>
                      )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!qualification.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(qualification.guideId)}
                    disabled={setPrimaryGuideMutation.isPending}
                    className="px-3 py-1.5 text-xs font-medium text-warning bg-warning/10 hover:bg-warning/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Set as primary guide"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() =>
                    handleRemoveGuide(
                      qualification.id,
                      `${qualification.guide.firstName} ${qualification.guide.lastName}`
                    )
                  }
                  disabled={removeQualificationMutation.isPending}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Remove qualification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Guide Section */}
      {availableGuides.length > 0 && (
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-medium text-foreground mb-3">Add Guide</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground mb-1">
                Select Guide
              </label>
              <select
                value={selectedGuideId}
                onChange={(e) => setSelectedGuideId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              >
                <option value="">Choose a guide...</option>
                {availableGuides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.firstName} {guide.lastName}
                    {guide.languages && guide.languages.length > 0
                      ? ` (${guide.languages.map((l) => l.toUpperCase()).join(", ")})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={setAsPrimary}
                  onChange={(e) => setSetAsPrimary(e.target.checked)}
                  className="w-4 h-4 text-primary border-input rounded focus:ring-primary"
                />
                <span className="text-foreground whitespace-nowrap">Set as primary</span>
              </label>
              <button
                onClick={handleAddGuide}
                disabled={!selectedGuideId || addQualificationMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {addQualificationMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Guide
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {availableGuides.length === 0 && qualifications.length > 0 && (
        <div className="border-t border-border pt-6">
          <p className="text-sm text-muted-foreground text-center">
            All active guides are already qualified for this tour
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && guideToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirmDialog(false)}
          />
          <div className="relative bg-card rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Remove Qualification
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to remove <strong>{guideToRemove.name}</strong> from
                  this tour's qualified guides? They will no longer be able to lead this
                  tour.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setGuideToRemove(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRemove}
                    disabled={removeQualificationMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {removeQualificationMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive-foreground border-t-transparent" />
                        Removing...
                      </span>
                    ) : (
                      "Remove"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
