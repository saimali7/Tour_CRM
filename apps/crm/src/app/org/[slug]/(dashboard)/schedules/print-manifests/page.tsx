"use client";

import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Loader2, Printer, Phone, Mail, MapPin, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ManifestParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  type: string;
  dietaryRequirements?: string | null;
  accessibilityNeeds?: string | null;
  notes?: string | null;
}

export default function PrintManifestsPage() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const [isPrinting, setIsPrinting] = useState(false);

  // Parse date from query param or use today
  const targetDate = useMemo(() => {
    const date = dateParam ? new Date(dateParam) : new Date();
    return date;
  }, [dateParam]);

  const dateFrom = useMemo(() => {
    const d = new Date(targetDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [targetDate]);

  // Fetch date summary to get schedule IDs
  const { data: dateSummary, isLoading: summaryLoading } = trpc.manifest.getForDate.useQuery({
    date: dateFrom,
  });

  // Get schedule IDs from summary
  const scheduleIds = useMemo(() =>
    dateSummary?.schedules?.map((s) => s.id) || [],
    [dateSummary]
  );

  // Fetch full manifests for each schedule
  const manifestQueries = trpc.useQueries((t) =>
    scheduleIds.map((id) => t.manifest.getForSchedule({ scheduleId: id }))
  );

  const allManifestsLoaded = manifestQueries.every((q) => !q.isLoading);
  const manifests = manifestQueries.map((q) => q.data).filter(Boolean);

  // Auto-print when loaded
  useEffect(() => {
    if (allManifestsLoaded && manifests.length > 0 && !isPrinting) {
      // Small delay to ensure rendering is complete
      const timeout = setTimeout(() => {
        setIsPrinting(true);
        window.print();
        setIsPrinting(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [allManifestsLoaded, manifests, isPrinting]);

  if (summaryLoading || !allManifestsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (manifests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 print:hidden">
        <p className="text-muted-foreground">No schedules found for {format(targetDate, "MMMM d, yyyy")}</p>
        <Button variant="outline" onClick={() => window.close()}>
          Close Window
        </Button>
      </div>
    );
  }

  return (
    <div className="print:p-0 p-8">
      {/* Print button - hidden when printing */}
      <div className="print:hidden mb-8 flex items-center justify-between bg-card p-4 rounded-lg border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Print Manifests</h1>
          <p className="text-sm text-muted-foreground">
            {manifests.length} schedules for {format(targetDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.close()}>
            Close
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print All
          </Button>
        </div>
      </div>

      {/* Manifests */}
      <div className="space-y-0">
        {manifests.map((manifest) => {
          if (!manifest) return null;

          // Flatten all participants from all bookings
          const allParticipants: ManifestParticipant[] = manifest.bookings.flatMap(
            (booking) => booking.participants || []
          );

          return (
            <div
              key={manifest.schedule.id}
              className="bg-white print:break-after-page print:border-0 border border-border rounded-lg mb-8 print:mb-0"
            >
              {/* Manifest Header */}
              <div className="p-6 print:p-4 border-b border-border print:border-gray-300">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl print:text-xl font-bold text-foreground print:text-black">
                      {manifest.tour?.name || "Tour"}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-muted-foreground print:text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(manifest.schedule.startsAt), "h:mm a")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {manifest.summary.totalParticipants} participants
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold print:text-black">
                      {format(new Date(manifest.schedule.startsAt), "EEEE")}
                    </p>
                    <p className="text-2xl font-bold text-primary print:text-black">
                      {format(new Date(manifest.schedule.startsAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {/* Meeting Point */}
                {manifest.schedule.meetingPoint && (
                  <div className="mt-4 p-3 bg-muted/50 print:bg-gray-100 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground print:text-gray-600" />
                      <div>
                        <p className="font-medium text-foreground print:text-black">
                          {manifest.schedule.meetingPoint}
                        </p>
                        {manifest.schedule.meetingPointDetails && (
                          <p className="text-sm text-muted-foreground print:text-gray-600">
                            {manifest.schedule.meetingPointDetails}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Guide Info */}
                {manifest.guides.length > 0 && (
                  <div className="mt-4 p-3 bg-primary/5 print:bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground print:text-gray-600 mb-1">
                      Assigned Guide{manifest.guides.length > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2">
                      {manifest.guides.map((guide) => (
                        <div key={guide.id} className="flex items-center gap-4">
                          <span className="font-medium text-foreground print:text-black">
                            {guide.firstName} {guide.lastName}
                          </span>
                          {guide.phone && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground print:text-gray-600">
                              <Phone className="h-3 w-3" />
                              {guide.phone}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Participant Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 print:bg-gray-100 border-b border-border print:border-gray-300">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground print:text-gray-600 uppercase tracking-wider w-8">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground print:text-gray-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground print:text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground print:text-gray-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground print:text-gray-600 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground print:text-gray-600 uppercase tracking-wider w-16">
                        Check
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border print:divide-gray-300">
                    {allParticipants.length > 0 ? (
                      allParticipants.map((participant: ManifestParticipant, idx: number) => (
                        <tr key={participant.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm text-muted-foreground print:text-gray-600">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground print:text-black">
                              {participant.firstName} {participant.lastName}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {participant.phone && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground print:text-gray-600">
                                  <Phone className="h-3 w-3" />
                                  {participant.phone}
                                </div>
                              )}
                              {participant.email && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground print:text-gray-600">
                                  <Mail className="h-3 w-3" />
                                  {participant.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              participant.type === "adult"
                                ? "bg-blue-100 text-blue-800 print:bg-gray-200 print:text-black"
                                : participant.type === "child"
                                ? "bg-green-100 text-green-800 print:bg-gray-200 print:text-black"
                                : "bg-purple-100 text-purple-800 print:bg-gray-200 print:text-black"
                            }`}>
                              {participant.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground print:text-gray-600 max-w-xs">
                            <div className="space-y-1">
                              {participant.dietaryRequirements && (
                                <p className="text-orange-600 print:text-black">
                                  Diet: {participant.dietaryRequirements}
                                </p>
                              )}
                              {participant.accessibilityNeeds && (
                                <p className="text-blue-600 print:text-black">
                                  Access: {participant.accessibilityNeeds}
                                </p>
                              )}
                              {participant.notes && (
                                <p>{participant.notes}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="w-6 h-6 border-2 border-border print:border-gray-400 rounded mx-auto" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground print:text-gray-600">
                          No participants for this schedule
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Manifest Footer */}
              <div className="p-4 border-t border-border print:border-gray-300 bg-muted/30 print:bg-gray-50">
                <div className="flex items-center justify-between text-sm text-muted-foreground print:text-gray-600">
                  <span>
                    Total: {manifest.summary.totalParticipants} participants ({manifest.summary.totalBookings} bookings)
                  </span>
                  <span>
                    Printed: {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
