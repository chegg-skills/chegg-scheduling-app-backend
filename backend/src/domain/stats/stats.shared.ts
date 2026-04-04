import { Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";

export type StatsTimeframeKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "lastQuarter"
  | "thisYear"
  | "lastYear"
  | "all"
  | string;

export type ResolvedTimeframe = {
  key: StatsTimeframeKey;
  label: string;
  start: Date | null;
  end: Date | null;
  rangeLabel: string;
};

export type StatsResponse<TMetrics extends Record<string, unknown>> = {
  timeframe: {
    key: StatsTimeframeKey;
    label: string;
    startDate: string | null;
    endDate: string | null;
    rangeLabel: string;
  };
  metrics: TMetrics;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatRangeLabel = (start: Date | null, end: Date | null): string => {
  if (!start || !end) {
    return "All time";
  }

  return `${DATE_FORMATTER.format(start)} – ${DATE_FORMATTER.format(end)}`;
};

const getStartOfDate = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getEndOfDate = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const resolveTimeframe = (timeframe?: string): ResolvedTimeframe => {
  const customPrefix = "custom:";
  if (timeframe?.startsWith(customPrefix)) {
    const parts = timeframe.substring(customPrefix.length).split(":");
    if (parts.length === 2) {
      const start = new Date(parts[0]);
      const end = new Date(parts[1]);

      if (end.getHours() === 0) {
        end.setHours(23, 59, 59, 999);
      }

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return {
          key: timeframe,
          label: "Custom Range",
          start,
          end,
          rangeLabel: formatRangeLabel(start, end),
        };
      }
    }
  }

  const normalized = (timeframe?.trim() || "thisMonth") as StatsTimeframeKey;
  const now = new Date();

  switch (normalized) {
    case "today": {
      const start = getStartOfDate(now);
      const end = getEndOfDate(now);
      return { key: "today", label: "Today", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "yesterday": {
      const date = new Date(now);
      date.setDate(date.getDate() - 1);
      const start = getStartOfDate(date);
      const end = getEndOfDate(date);
      return { key: "yesterday", label: "Yesterday", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "thisWeek": {
      const start = getStartOfDate(now);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      const end = getEndOfDate(start);
      end.setDate(end.getDate() + 6);
      return { key: "thisWeek", label: "This week", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "lastWeek": {
      const start = getStartOfDate(now);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff - 7);
      const end = getEndOfDate(start);
      end.setDate(end.getDate() + 6);
      return { key: "lastWeek", label: "Last week", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { key: "thisMonth", label: "This month", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { key: "lastMonth", label: "Last month", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "thisQuarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { key: "thisQuarter", label: "This quarter", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "lastQuarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { key: "lastQuarter", label: "Last quarter", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "thisYear": {
      const start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { key: "thisYear", label: "This year", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "lastYear": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      return { key: "lastYear", label: "Last year", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
    case "all":
      return { key: "all", label: "All time", start: null, end: null, rangeLabel: "All time" };
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { key: "thisMonth", label: "This month", start, end, rangeLabel: formatRangeLabel(start, end) };
    }
  }
};

export const toResponseTimeframe = (timeframe: ResolvedTimeframe) => ({
  key: timeframe.key,
  label: timeframe.label,
  startDate: timeframe.start?.toISOString() ?? null,
  endDate: timeframe.end?.toISOString() ?? null,
  rangeLabel: timeframe.rangeLabel,
});

export const buildStatsResponse = <TMetrics extends Record<string, unknown>>(
  timeframe: ResolvedTimeframe,
  metrics: TMetrics,
): StatsResponse<TMetrics> => ({
  timeframe: toResponseTimeframe(timeframe),
  metrics,
});

export const requireAdmin = (caller: CallerContext): void => {
  if (
    caller.role !== UserRole.SUPER_ADMIN &&
    caller.role !== UserRole.TEAM_ADMIN
  ) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "You are not authorized to view these stats.",
    );
  }
};

export const buildDateFilter = (
  timeframe: ResolvedTimeframe,
): Prisma.DateTimeFilter | undefined => {
  if (!timeframe.start || !timeframe.end) {
    return undefined;
  }

  return {
    gte: timeframe.start,
    lte: timeframe.end,
  };
};
