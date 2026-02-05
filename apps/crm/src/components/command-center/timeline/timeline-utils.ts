export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 24;
const TIMELINE_START_MINUTES = TIMELINE_START_HOUR * 60;
const TIMELINE_END_MINUTES = TIMELINE_END_HOUR * 60;
const TIMELINE_DURATION_MINUTES = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES;

function parseTime(time: string | null | undefined): number {
  if (!time) return TIMELINE_START_MINUTES;
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return TIMELINE_START_MINUTES;
  return hour * 60 + minute;
}

export function timeToPercent(time: string): number {
  const minutes = parseTime(time);
  const clamped = Math.max(TIMELINE_START_MINUTES, Math.min(TIMELINE_END_MINUTES, minutes));
  return ((clamped - TIMELINE_START_MINUTES) / TIMELINE_DURATION_MINUTES) * 100;
}

export function durationToPercent(durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return (durationMinutes / TIMELINE_DURATION_MINUTES) * 100;
}

export function formatTimeDisplay(time: string): string {
  const minutes = parseTime(time);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  if (hour === 0 || hour === 24) return minute === 0 ? "12 AM" : `12:${minute.toString().padStart(2, "0")} AM`;
  if (hour === 12) return minute === 0 ? "12 PM" : `12:${minute.toString().padStart(2, "0")} PM`;
  const displayHour = hour > 12 ? hour - 12 : hour;
  const period = hour >= 12 ? "PM" : "AM";
  return minute === 0
    ? `${displayHour} ${period}`
    : `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}
