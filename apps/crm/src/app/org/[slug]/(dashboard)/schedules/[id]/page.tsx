"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, Edit, Clock, Users, DollarSign, MapPin, Calendar, User } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ScheduleGuideAssignment } from "@/components/schedules/schedule-guide-assignment";
import { ScheduleManifest } from "@/components/schedules/schedule-manifest";

type Tab = "details" | "manifest";

export default function ScheduleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const scheduleId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const { data: schedule, isLoading, error } = trpc.schedule.getById.useQuery({ id: scheduleId });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading schedule: {error.message}</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">Schedule not found</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/schedules` as Route}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {schedule.tour?.name || "Schedule Details"}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  schedule.status === "scheduled"
                    ? "bg-blue-100 text-blue-800"
                    : schedule.status === "in_progress"
                    ? "bg-yellow-100 text-yellow-800"
                    : schedule.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {schedule.status === "in_progress" ? "In Progress" : schedule.status}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{formatDate(schedule.startsAt)}</p>
          </div>
        </div>
        <Link
          href={`/org/${slug}/schedules/${schedule.id}/edit` as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit Schedule
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("details")}
            className={`${
              activeTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("manifest")}
            className={`${
              activeTab === "manifest"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Manifest
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-semibold text-gray-900">
                {formatTime(schedule.startsAt)} - {formatTime(schedule.endsAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Availability</p>
              <p className="font-semibold text-gray-900">
                {schedule.bookedCount ?? 0} / {schedule.maxParticipants}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Price</p>
              <p className="font-semibold text-gray-900">
                {schedule.price ? `$${parseFloat(schedule.price).toFixed(2)}` : "Tour default"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <User className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Guide</p>
              <p className="font-semibold text-gray-900">
                {schedule.guide
                  ? `${schedule.guide.firstName} ${schedule.guide.lastName}`
                  : "Not assigned"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Assignment */}
      {schedule.tour && (
        <ScheduleGuideAssignment
          scheduleId={schedule.id}
          tourId={schedule.tour.id}
          startsAt={schedule.startsAt}
          endsAt={schedule.endsAt}
        />
      )}

      {/* Tour Info */}
      {schedule.tour && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tour Information</h2>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{schedule.tour.name}</h3>
              <p className="text-gray-500 mt-1">
                {schedule.tour.durationMinutes} minutes • ${parseFloat(schedule.tour.basePrice).toFixed(2)}
              </p>
              <Link
                href={`/org/${slug}/tours/${schedule.tour.id}` as Route}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                View Tour Details
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Point */}
      {(schedule.meetingPoint || schedule.meetingPointDetails) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Meeting Point</h2>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">
                {schedule.meetingPoint || "Not specified"}
              </p>
              {schedule.meetingPointDetails && (
                <p className="text-gray-600 mt-1">
                  {schedule.meetingPointDetails}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {(schedule.internalNotes || schedule.publicNotes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schedule.internalNotes && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{schedule.internalNotes}</p>
            </div>
          )}
          {schedule.publicNotes && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Public Notes</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{schedule.publicNotes}</p>
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {activeTab === "manifest" && <ScheduleManifest scheduleId={scheduleId} />}
    </div>
  );
}
