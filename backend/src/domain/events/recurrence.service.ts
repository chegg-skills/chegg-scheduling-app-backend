import { addDays, addMonths, addWeeks } from "date-fns";

export type RecurrenceFrequency = "WEEKLY" | "BI_WEEKLY" | "MONTHLY" | "TWICE_A_MONTH" | "THRICE_A_WEEK";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  occurrences: number; // Max number of slots to generate
}

export function generateRecurrenceDates(startDate: Date, rule: RecurrenceRule): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < rule.occurrences; i++) {
    // Skip the first one if we want to include the start date? 
    // Usually, the first one is the startDate itself.
    dates.push(new Date(currentDate));

    switch (rule.frequency) {
      case "WEEKLY":
        currentDate = addWeeks(currentDate, 1);
        break;
      case "BI_WEEKLY":
        currentDate = addWeeks(currentDate, 2);
        break;
      case "MONTHLY":
        currentDate = addMonths(currentDate, 1);
        break;
      case "TWICE_A_MONTH":
        // This is tricky. Usually means roughly every 14-15 days.
        // A common implementation is same day of month + same day + 14 days?
        // Or specific days like 1st and 15th.
        // For now, let's do 14 days as a simple interpretation.
        currentDate = addDays(currentDate, 14);
        break;
      case "THRICE_A_WEEK":
        // Simplified: every 2-3 days? No, better to just do +2 days then +2 then +3 to complete a week.
        // Actually, for "Thrice a week", it's better to let the user pick days, 
        // but if they just want "recurring", we can alternate +2, +2, +3.
        const dayDiff = (i % 3 === 2) ? 3 : 2;
        currentDate = addDays(currentDate, dayDiff);
        break;
    }

    // Safety check to prevent generating dates too far in the future (e.g. 10 years)
    if (currentDate.getFullYear() > new Date().getFullYear() + 2) break;
  }

  return dates;
}
