import { useState, useMemo, useEffect } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import { usePagination } from "./usePagination";
import type { BookingStatus, StatsTimeframe } from "@/types";

type FilterType = "UPCOMING" | "ALL" | BookingStatus;

interface AdvancedFilters {
  teamId: string;
  eventId: string;
  startDate: Date | null;
  endDate: Date | null;
}

const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  teamId: "",
  eventId: "",
  startDate: null,
  endDate: null,
};

export function useBookingFilters() {
  const {
    pageSize,
    backendPage,
    onPageChange,
    onRowsPerPageChange,
    resetPage,
  } = usePagination(25);

  const [statusFilter, setStatusFilter] = useState<FilterType>("UPCOMING");
  const [searchInput, setSearchInput] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(
    DEFAULT_ADVANCED_FILTERS,
  );
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [timeframe, setTimeframe] = useState<StatsTimeframe>("month");

  const debouncedSearch = useDebouncedValue(searchInput, 250);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, statusFilter, advancedFilters, resetPage]);

  const serverFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status:
        statusFilter === "UPCOMING"
          ? ("CONFIRMED" as BookingStatus)
          : statusFilter === "ALL"
            ? undefined
            : statusFilter,
      teamId: advancedFilters.teamId || undefined,
      eventId: advancedFilters.eventId || undefined,
      startDate: advancedFilters.startDate?.toISOString(),
      endDate: advancedFilters.endDate?.toISOString(),
      page: backendPage,
      pageSize,
    }),
    [debouncedSearch, statusFilter, advancedFilters, backendPage, pageSize],
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: FilterType) => {
    setStatusFilter(newValue);
  };

  const handleFilterChange = (key: string, value: any) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "teamId") next.eventId = "";
      return next;
    });
  };

  const handleResetFilters = () => {
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
  };

  const activeFilterCount = Object.values(advancedFilters).filter(
    (v) => v !== "" && v !== null,
  ).length;

  return {
    // filter state
    statusFilter,
    searchInput,
    setSearchInput,
    advancedFilters,
    setAdvancedFilters,
    isFilterDialogOpen,
    setIsFilterDialogOpen,
    serverFilters,
    handleTabChange,
    handleFilterChange,
    handleResetFilters,
    activeFilterCount,
    // view state
    viewMode,
    setViewMode,
    timeframe,
    setTimeframe,
    // pagination
    onPageChange,
    onRowsPerPageChange,
  };
}
