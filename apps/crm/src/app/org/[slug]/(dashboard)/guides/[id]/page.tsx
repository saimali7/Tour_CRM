"use client";

import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Calendar,
  Clock,
  Globe,
  Shield,
  AlertCircle,
  User,
  FileText,
  Award,
  Settings,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";
import { GuideAvailability } from "@/components/guides/guide-availability";

export default function GuideDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const guideId = params.id as string;
  const [activeTab, setActiveTab] = useState<"schedules" | "notes" | "availability">("schedules");

  const { data: guide, isLoading, error } = trpc.guide.getByIdWithStats.useQuery({
    id: guideId,
  });

  const { data: schedules } = trpc.guide.getSchedules.useQuery({ id: guideId });

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
        <p className="text-red-600">Error loading guide: {error.message}</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">Guide not found</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "on_leave":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScheduleStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const upcomingSchedules = schedules?.filter(
    (s) => new Date(s.startsAt) > new Date() && s.status === "scheduled"
  ) || [];

  const pastSchedules = schedules?.filter(
    (s) => new Date(s.startsAt) <= new Date() || s.status !== "scheduled"
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/guides` as Route}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              {guide.avatarUrl ? (
                <img
                  src={guide.avatarUrl}
                  alt={`${guide.firstName} ${guide.lastName}`}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold text-xl">
                  {guide.firstName[0]}
                  {guide.lastName[0]}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {guide.firstName} {guide.lastName}
              </h1>
              <p className="text-gray-500 mt-1">Guide since {formatDate(guide.createdAt)}</p>
            </div>
          </div>
        </div>

        <Link
          href={`/org/${slug}/guides/${guide.id}/edit` as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit Guide
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Schedules</p>
              <p className="text-xl font-semibold text-gray-900">
                {guide.totalSchedules ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming</p>
              <p className="text-xl font-semibold text-gray-900">
                {guide.upcomingSchedules ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Languages</p>
              <p className="text-xl font-semibold text-gray-900">
                {guide.languages?.length ?? 0}
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
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  guide.status
                )}`}
              >
                {guide.status === "on_leave"
                  ? "On Leave"
                  : guide.status.charAt(0).toUpperCase() + guide.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a
                  href={`mailto:${guide.email}`}
                  className="text-gray-900 hover:text-primary"
                >
                  {guide.email}
                </a>
              </div>
            </div>

            {guide.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <a
                    href={`tel:${guide.phone}`}
                    className="text-gray-900 hover:text-primary"
                  >
                    {guide.phone}
                  </a>
                </div>
              </div>
            )}

            {guide.emergencyContactName && (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Emergency Contact</p>
                  <p className="text-gray-900">{guide.emergencyContactName}</p>
                  {guide.emergencyContactPhone && (
                    <a
                      href={`tel:${guide.emergencyContactPhone}`}
                      className="text-gray-900 hover:text-primary text-sm"
                    >
                      {guide.emergencyContactPhone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bio</h2>
          <div className="space-y-4">
            {guide.bio ? (
              <div>
                <p className="text-sm text-gray-500 mb-2">Full Bio</p>
                <p className="text-gray-900 whitespace-pre-wrap">{guide.bio}</p>
              </div>
            ) : (
              <p className="text-gray-500">No bio available</p>
            )}

            {guide.shortBio && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Short Bio</p>
                <p className="text-gray-900">{guide.shortBio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Qualifications</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Languages</p>
              {guide.languages && guide.languages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {guide.languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No languages specified</p>
              )}
            </div>

            {guide.certifications && guide.certifications.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {guide.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-2">Status</p>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                guide.status
              )}`}
            >
              {guide.status === "on_leave"
                ? "On Leave"
                : guide.status.charAt(0).toUpperCase() + guide.status.slice(1)}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">Public Profile</p>
            <p className="text-gray-900">{guide.isPublic ? "Yes" : "No"}</p>
          </div>

          {guide.availabilityNotes && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Availability Notes</p>
              <p className="text-gray-900">{guide.availabilityNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Section: Schedules, Availability & Notes */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("schedules")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "schedules"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedules ({schedules?.length ?? 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("availability")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "availability"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Availability
              </div>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "notes"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Schedules Tab */}
          {activeTab === "schedules" && (
            <>
              {schedules && schedules.length > 0 ? (
                <div className="space-y-6">
                  {/* Upcoming Schedules */}
                  {upcomingSchedules.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Upcoming Schedules
                      </h3>
                      <div className="divide-y divide-gray-200">
                        {upcomingSchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="py-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/org/${slug}/schedules/${schedule.id}` as Route}
                                    className="font-medium text-gray-900 hover:text-primary"
                                  >
                                    {schedule.tour?.name || "Unknown Tour"}
                                  </Link>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScheduleStatusColor(
                                      schedule.status
                                    )}`}
                                  >
                                    {schedule.status.charAt(0).toUpperCase() +
                                      schedule.status.slice(1).replace("_", " ")}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {formatDateTime(schedule.startsAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">
                                  {schedule.maxParticipants} capacity
                                </p>
                              </div>
                              <Link
                                href={`/org/${slug}/schedules/${schedule.id}` as Route}
                                className="text-primary hover:underline text-sm"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Schedules */}
                  {pastSchedules.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Past Schedules
                      </h3>
                      <div className="divide-y divide-gray-200">
                        {pastSchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="py-4 flex items-center justify-between opacity-60"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/org/${slug}/schedules/${schedule.id}` as Route}
                                    className="font-medium text-gray-900 hover:text-primary"
                                  >
                                    {schedule.tour?.name || "Unknown Tour"}
                                  </Link>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScheduleStatusColor(
                                      schedule.status
                                    )}`}
                                  >
                                    {schedule.status.charAt(0).toUpperCase() +
                                      schedule.status.slice(1).replace("_", " ")}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {formatDateTime(schedule.startsAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">
                                  {schedule.maxParticipants} capacity
                                </p>
                              </div>
                              <Link
                                href={`/org/${slug}/schedules/${schedule.id}` as Route}
                                className="text-primary hover:underline text-sm"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500">No schedules yet</p>
                  <Link
                    href={`/org/${slug}/schedules/new` as Route}
                    className="mt-2 inline-block text-primary hover:underline"
                  >
                    Create a schedule
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Availability Tab */}
          {activeTab === "availability" && (
            <GuideAvailability guideId={guideId} />
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <>
              {guide.notes ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{guide.notes}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500">No internal notes</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
