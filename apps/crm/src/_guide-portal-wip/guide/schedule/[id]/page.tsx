"use client";

import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  Mail,
  Phone,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { Button } from "@tour/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@tour/ui";
import { Badge } from "@tour/ui";
import { Skeleton } from "@tour/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@tour/ui/components/table";

interface ScheduleManifestPageProps {
  params: Promise<{ id: string }>;
}

export default function ScheduleManifestPage({ params }: ScheduleManifestPageProps) {
  const { id } = use(params);
  const { data: manifest, isLoading } = trpc.guidePortal.getScheduleManifest.useQuery({
    scheduleId: id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Schedule not found or you don't have access.</p>
        <Link href="/guide">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const { schedule, manifest: bookings, stats } = manifest;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/guide">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{schedule.tour.name}</h1>
        <p className="text-gray-600 mt-1">Tour Manifest & Participant Details</p>
      </div>

      {/* Schedule Details */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <div className="font-medium">Date & Time</div>
                <div className="text-gray-600">
                  {format(new Date(schedule.startsAt), "PPP 'at' p")}
                </div>
              </div>
            </div>

            {schedule.meetingPoint && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="font-medium">Meeting Point</div>
                  <div className="text-gray-600">{schedule.meetingPoint}</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-400" />
              <div>
                <div className="font-medium">Participants</div>
                <div className="text-gray-600">
                  {stats.totalParticipants} / {schedule.maxParticipants || "Unlimited"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <div>
                <div className="font-medium">Total Revenue</div>
                <div className="text-gray-600">
                  {schedule.currency || "USD"} {stats.totalRevenue}
                </div>
              </div>
            </div>
          </div>

          {schedule.meetingPointDetails && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="text-sm font-medium mb-1">Meeting Point Details</div>
              <div className="text-sm text-gray-600">{schedule.meetingPointDetails}</div>
            </div>
          )}

          {schedule.publicNotes && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="text-sm font-medium mb-1">Public Notes</div>
              <div className="text-sm text-gray-600">{schedule.publicNotes}</div>
            </div>
          )}

          {schedule.internalNotes && (
            <div className="mt-4 p-3 bg-amber-50 rounded-md">
              <div className="text-sm font-medium mb-1">Internal Notes</div>
              <div className="text-sm text-gray-600">{schedule.internalNotes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">Total Participants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.spotsRemaining}</div>
            <p className="text-xs text-muted-foreground">Spots Remaining</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {schedule.currency || "USD"} {stats.totalRevenue}
            </div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Participant Manifest */}
      <Card>
        <CardHeader>
          <CardTitle>Participant Manifest</CardTitle>
          <CardDescription>
            List of all confirmed bookings for this tour
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No confirmed bookings yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Participants</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.referenceNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {booking.customer.firstName} {booking.customer.lastName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {booking.customer.email && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Mail className="h-3 w-3" />
                            <a
                              href={`mailto:${booking.customer.email}`}
                              className="hover:underline"
                            >
                              {booking.customer.email}
                            </a>
                          </div>
                        )}
                        {booking.customer.phone && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="h-3 w-3" />
                            <a
                              href={`tel:${booking.customer.phone}`}
                              className="hover:underline"
                            >
                              {booking.customer.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{booking.participants}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {format(new Date(booking.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {booking.currency} {parseFloat(booking.totalPrice).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
