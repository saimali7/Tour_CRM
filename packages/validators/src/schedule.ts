import { z } from "zod";

// Schedule status enum
export const scheduleStatusSchema = z.enum(["scheduled", "in_progress", "completed", "cancelled"]);
export type ScheduleStatus = z.infer<typeof scheduleStatusSchema>;

// Create schedule validation
export const createScheduleSchema = z.object({
  tourId: z.string().min(1, "Tour is required"),
  guideId: z.string().optional(),
  startsAt: z.coerce.date({
    required_error: "Start time is required",
    invalid_type_error: "Invalid start time",
  }),
  endsAt: z.coerce.date({
    required_error: "End time is required",
    invalid_type_error: "Invalid end time",
  }),
  maxParticipants: z
    .number()
    .int("Maximum participants must be a whole number")
    .min(1, "Must allow at least 1 participant"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  meetingPoint: z.string().max(200).optional(),
  meetingPointDetails: z.string().max(500).optional(),
  internalNotes: z.string().max(1000).optional(),
  publicNotes: z.string().max(1000).optional(),
}).refine(
  (data) => data.endsAt > data.startsAt,
  {
    message: "End time must be after start time",
    path: ["endsAt"],
  }
).refine(
  (data) => data.startsAt > new Date(),
  {
    message: "Schedule must be in the future",
    path: ["startsAt"],
  }
);

// Update schedule validation
export const updateScheduleSchema = z.object({
  guideId: z.string().optional().nullable(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  maxParticipants: z.number().int().min(1).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  meetingPoint: z.string().max(200).optional(),
  meetingPointDetails: z.string().max(500).optional(),
  internalNotes: z.string().max(1000).optional(),
  publicNotes: z.string().max(1000).optional(),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
