"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  Calendar,
  Clock,
  MapPin,
  XCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// Mock assignment data - replace with tRPC query
interface AssignmentDetails {
  id: string;
  tourName: string;
  date: Date;
  time: string;
  meetingPoint: string;
  participants: number;
  duration: string;
}

export default function DeclineAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const [reason, setReason] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);

  // Mock data - replace with actual tRPC query
  const assignment: AssignmentDetails = {
    id: assignmentId,
    tourName: "City Walking Tour",
    date: new Date("2025-12-15T09:00:00"),
    time: "9:00 AM",
    meetingPoint: "Main Square Fountain",
    participants: 12,
    duration: "3 hours",
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const handleDecline = async () => {
    setIsDeclining(true);

    // Mock API call - replace with tRPC mutation
    // await declineAssignment.mutateAsync({ assignmentId, reason });

    setTimeout(() => {
      setIsDeclining(false);
      setIsDeclined(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/guide/assignments");
      }, 2000);
    }, 1000);
  };

  if (isDeclined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Assignment Declined
          </h2>
          <p className="text-gray-600 mb-4">
            You have declined this tour assignment. The team has been notified.
            Redirecting you back...
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/guide/assignments" as Route
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Decline Assignment</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Let us know why you can't take this tour
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-8 text-white">
            <h2 className="text-2xl font-bold mb-2">{assignment.tourName}</h2>
            <p className="text-red-100">You are declining this tour assignment</p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(assignment.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-lg">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Time & Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {assignment.time}
                  </p>
                  <p className="text-sm text-gray-600">{assignment.duration}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-lg">
                  <MapPin className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Meeting Point</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {assignment.meetingPoint}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Please note
                </p>
                <p className="text-sm text-yellow-700">
                  Declining this assignment will notify the team immediately. They will
                  need to find another guide for this tour.
                </p>
              </div>
            </div>

            {/* Reason Input */}
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Reason for declining (optional)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="e.g., Already have another commitment, not available on this date, feeling unwell..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-base resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                Providing a reason helps the team understand and plan better.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/guide/assignments" as Route
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
              >
                Go Back
              </Link>
              <button
                onClick={handleDecline}
                disabled={isDeclining}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeclining ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Declining...
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Decline Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
