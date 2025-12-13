"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

// Mock assignment data - replace with tRPC query
interface AssignmentDetails {
  id: string;
  tourName: string;
  date: Date;
  time: string;
  meetingPoint: string;
  meetingPointDetails: string;
  participants: number;
  duration: string;
}

export default function ConfirmAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Mock data - replace with actual tRPC query
  const assignment: AssignmentDetails = {
    id: assignmentId,
    tourName: "City Walking Tour",
    date: new Date("2025-12-15T09:00:00"),
    time: "9:00 AM",
    meetingPoint: "Main Square Fountain",
    meetingPointDetails:
      "Meet at the central fountain in Main Square. Look for the blue umbrella.",
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

  const handleConfirm = async () => {
    setIsConfirming(true);

    // Mock API call - replace with tRPC mutation
    // await confirmAssignment.mutateAsync({ assignmentId });

    setTimeout(() => {
      setIsConfirming(false);
      setIsConfirmed(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/guide/assignments");
      }, 2000);
    }, 1000);
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Assignment Confirmed!
          </h2>
          <p className="text-gray-600 mb-4">
            You have successfully accepted this tour assignment. Redirecting you back...
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
            <h1 className="text-2xl font-bold text-gray-900">Confirm Assignment</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Review and accept this tour assignment
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <h2 className="text-2xl font-bold mb-2">{assignment.tourName}</h2>
            <p className="text-blue-100">You are being assigned to lead this tour</p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(assignment.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
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
                <div className="p-3 bg-blue-50 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Meeting Point</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {assignment.meetingPoint}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {assignment.meetingPointDetails}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Expected Participants
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {assignment.participants}
                </span>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> By confirming this assignment, you commit to
                leading this tour at the scheduled date and time. Please ensure you are
                available.
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
                onClick={handleConfirm}
                disabled={isConfirming}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Confirm Assignment
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
