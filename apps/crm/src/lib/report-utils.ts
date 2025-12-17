/**
 * Shared utilities for report pages
 */

export function getDateRangeFromString(rangeString: string): { from: Date; to: Date } {
  const now = new Date();
  let to = new Date(now);
  let from = new Date(now);

  switch (rangeString) {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setDate(now.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case "this_week":
      from.setDate(now.getDate() - now.getDay());
      from.setHours(0, 0, 0, 0);
      break;
    case "last_week":
      from.setDate(now.getDate() - now.getDay() - 7);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setDate(now.getDate() - now.getDay() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case "this_month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case "last_month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case "last_30_days":
      from.setDate(now.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    case "last_90_days":
      from.setDate(now.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      break;
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "this_quarter":
      from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      from.setHours(0, 0, 0, 0);
      break;
    case "last_year":
      from = new Date(now.getFullYear() - 1, 0, 1);
      to = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    case "all_time":
      from = new Date(2020, 0, 1); // Reasonable start for tour business
      from.setHours(0, 0, 0, 0);
      break;
    default:
      // Default to last 30 days
      from.setDate(now.getDate() - 30);
      from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}
