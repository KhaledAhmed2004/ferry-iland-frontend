"use client";

import * as React from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Navigation,
  Plus,
  RefreshCw,
  Ship,
  Users
} from "lucide-react";
import {
  useBulkDeleteSchedulesMutation,
  useBulkUpdateScheduleStatusMutation,
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useFerriesQuery,
  useOperatorSchedulesQuery,
  useRoutesQuery,
  useTableSelection,
  useUpdateScheduleMutation,
  useUpdateScheduleStatusMutation
} from "@/hooks";
import type {
  IOperatorSchedule,
  OperatorScheduleStatus
} from "@/types";
import {
  Button,
  Card,
  CardContent,
  Input,
  ReusableSelect,
  Tabs,
  TabsList,
  TabsTrigger
} from "@/ui";
import {
  DashboardTableCard,
  StatCard,
  TablePagination
} from "@/widgets";

import { ScheduleBulkToolbar } from "./_components/ScheduleBulkToolbar";
import { ScheduleDeleteDialogs } from "./_components/ScheduleDeleteDialogs";
import { ScheduleFormModal } from "./_components/ScheduleFormModal";
import { getScheduleColumns } from "./_components/schedules-columns";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 per page" },
  { value: "20", label: "20 per page" },
  { value: "50", label: "50 per page" }
];

export default function OperatorSchedulesPage() {
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [routeFilter, setRouteFilter] = React.useState<string>("ALL");
  const [dateFilter, setDateFilter] = React.useState<string>("");

  // Pagination states
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Bulk action state
  const [isBulkOperating, setIsBulkOperating] = React.useState(false);
  const [bulkActionType, setBulkActionType] = React.useState<
    "on_time" | "boarding" | "departed" | "delayed" | "arrived" | "cancelled" | "delete" | null
  >(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = React.useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<IOperatorSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = React.useState<IOperatorSchedule | null>(null);

  // 1. Queries
  const {
    data: scheduleData,
    isLoading: isSchedulesLoading,
    isError: isSchedulesError,
    error: schedulesError,
    refetch: refetchSchedules,
    isFetching: isSchedulesFetching
  } = useOperatorSchedulesQuery({
    status: activeTab === "all" ? undefined : activeTab,
    routeId: routeFilter === "ALL" ? undefined : routeFilter,
    date: dateFilter || undefined,
    page,
    limit: pageSize
  });

  const { data: routesData, isLoading: isRoutesLoading } = useRoutesQuery({ limit: 100 });
  const { data: ferriesData, isLoading: isFerriesLoading } = useFerriesQuery({ limit: 100 });

  // 2. Mutations
  const createScheduleMutation = useCreateScheduleMutation();
  const updateScheduleMutation = useUpdateScheduleMutation();
  const updateStatusMutation = useUpdateScheduleStatusMutation();
  const deleteScheduleMutation = useDeleteScheduleMutation();
  const bulkStatusMutation = useBulkUpdateScheduleStatusMutation();
  const bulkDeleteMutation = useBulkDeleteSchedulesMutation();

  // Reset page whenever tab, route, date, or page size changes (guarded against initial mount)
  const isFirstMount = React.useRef(true);
  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setPage(1);
    clearSelection();
  }, [activeTab, routeFilter, dateFilter, pageSize]);

  // Schedules dataset & Pagination calculations
  const rawSchedules = React.useMemo(() => scheduleData?.schedules ?? [], [scheduleData?.schedules]);
  const meta = scheduleData?.meta;
  const totalCount = meta?.total ?? rawSchedules.length;
  const totalPages = Math.max(1, meta?.totalPages ?? Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  // Sliced schedules for resilience
  const displayedSchedules = React.useMemo(() => {
    if (rawSchedules.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return rawSchedules.slice(start, start + pageSize);
    }
    return rawSchedules;
  }, [rawSchedules, currentPage, pageSize]);

  const schedules = displayedSchedules;

  // Keep page clamped ONLY when query has settled and is not in flight
  React.useEffect(() => {
    if (!isSchedulesLoading && !isSchedulesFetching && scheduleData && page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages, isSchedulesLoading, isSchedulesFetching, scheduleData]);

  // Selection Computations via headless hook
  const {
    selectedIds: selectedScheduleIds,
    selectedCount,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    toggleRow: toggleSelectRow,
    toggleSelectAllCurrentPage,
    clearSelection
  } = useTableSelection({
    items: schedules
  });

  // Action handlers
  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleOpenEdit = React.useCallback((s: IOperatorSchedule) => setEditingSchedule(s), []);
  const handleOpenDelete = React.useCallback((s: IOperatorSchedule) => setDeletingSchedule(s), []);

  const handleQuickStatusChange = async (scheduleId: string, nextStatus: OperatorScheduleStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: scheduleId,
        status: nextStatus
      });
    } catch {
      // mutation handles toast
    }
  };

  const handleCreateSchedule = async (payload: {
    routeId: string;
    ferryId: string;
    departureTime: string;
    arrivalTime: string;
    adultFare: number;
    childFare?: number;
  }) => {
    await createScheduleMutation.mutateAsync(payload);
    setPage(1);
    setIsAddModalOpen(false);
  };

  const handleUpdateSchedule = async (payload: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    status: OperatorScheduleStatus;
    adultFare: number;
    childFare?: number;
  }) => {
    await updateScheduleMutation.mutateAsync({
      id: payload.id,
      payload: {
        departureTime: payload.departureTime,
        arrivalTime: payload.arrivalTime,
        adultFare: payload.adultFare,
        childFare: payload.childFare
      }
    });

    if (editingSchedule && payload.status !== editingSchedule.status) {
      await updateStatusMutation.mutateAsync({
        id: payload.id,
        status: payload.status
      });
    }

    setEditingSchedule(null);
  };

  const handleDeleteSchedule = async () => {
    if (!deletingSchedule) return;
    try {
      await deleteScheduleMutation.mutateAsync(deletingSchedule.id);
      setDeletingSchedule(null);
    } catch {
      // mutation handles toast
    }
  };

  // Bulk Handlers
  const handleBulkSetStatus = async (status: OperatorScheduleStatus) => {
    if (selectedScheduleIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedScheduleIds);
    setIsBulkOperating(true);
    setBulkActionType(status.toLowerCase() as any);

    try {
      await bulkStatusMutation.mutateAsync({ ids, status });
      clearSelection();
    } catch {
      // Handled by mutation onError toast
    } finally {
      setIsBulkOperating(false);
      setBulkActionType(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedScheduleIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedScheduleIds);
    setIsBulkOperating(true);
    setBulkActionType("delete");

    try {
      await bulkDeleteMutation.mutateAsync(ids);
      clearSelection();
      setIsBulkDeleteModalOpen(false);
    } catch {
      // Handled by mutation onError toast
    } finally {
      setIsBulkOperating(false);
      setBulkActionType(null);
    }
  };

  // Filter dropdown options
  const filterRouteOptions = React.useMemo(() => {
    const list = routesData?.routes ?? [];
    return [
      { value: "ALL", label: "All Routes" },
      ...list.map((r) => ({
        value: r.id,
        label: `${r.departurePort?.name ?? "Origin"} ➔ ${r.destinationPort?.name ?? "Dest"}`
      }))
    ];
  }, [routesData?.routes]);

  // Columns definition
  const columns = React.useMemo(() => {
    return getScheduleColumns({
      selectedScheduleIds,
      isAllCurrentPageSelected,
      isSomeCurrentPageSelected,
      toggleSelectAllCurrentPage,
      toggleSelectRow,
      onEdit: handleOpenEdit,
      onDelete: handleOpenDelete,
      onQuickStatusChange: handleQuickStatusChange,
      isUpdatingStatus: updateStatusMutation.isPending
    });
  }, [
    selectedScheduleIds,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    toggleSelectAllCurrentPage,
    toggleSelectRow,
    handleOpenEdit,
    handleOpenDelete,
    updateStatusMutation.isPending
  ]);

  // Aggregate Stats
  const boardingCount = schedules.filter((s) => s.status === "BOARDING").length;
  const onTimeCount = schedules.filter((s) => s.status === "ON_TIME").length;
  const delayedCount = schedules.filter((s) => s.status === "DELAYED").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Schedule Management
            </h1>
            {isSchedulesFetching && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                Syncing
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize ferry departure timetables, monitor seat bookings, and update live sailing statuses.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Trips"
          value={totalCount}
          description="Scheduled sailings"
          icon={Calendar}
          variant="emerald"
        />
        <StatCard
          title="On Time"
          value={onTimeCount}
          description="Operating as planned"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Boarding Now"
          value={boardingCount}
          description="Gates open"
          icon={Users}
          variant="blue"
        />
        <StatCard
          title="Delayed"
          value={delayedCount}
          description="Experiencing delays"
          icon={Clock}
          variant="amber"
        />
      </div>

      {/* Filter Bar */}
      <Card className="border-border/80 bg-card p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full md:w-auto overflow-x-auto"
          >
            <TabsList className="bg-muted/80 p-1 h-9">
              <TabsTrigger value="all" className="text-xs font-semibold px-3 py-1 cursor-pointer">
                All
              </TabsTrigger>
              <TabsTrigger value="ON_TIME" className="text-xs font-semibold px-3 py-1 cursor-pointer">
                On Time
              </TabsTrigger>
              <TabsTrigger value="BOARDING" className="text-xs font-semibold px-3 py-1 cursor-pointer">
                Boarding
              </TabsTrigger>
              <TabsTrigger value="DEPARTED" className="text-xs font-semibold px-3 py-1 cursor-pointer">
                Departed
              </TabsTrigger>
              <TabsTrigger value="DELAYED" className="text-xs font-semibold px-3 py-1 cursor-pointer">
                Delayed
              </TabsTrigger>
              <TabsTrigger value="ARRIVED" className="text-xs font-semibold px-3 py-1 cursor-pointer">
                Arrived
              </TabsTrigger>
              <TabsTrigger value="CANCELLED" className="text-xs font-semibold px-3 py-1 cursor-pointer">
                Cancelled
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-48">
              <ReusableSelect
                value={routeFilter}
                onValueChange={setRouteFilter}
                options={filterRouteOptions}
                placeholder="Filter by route..."
              />
            </div>
            <div className="w-full sm:w-36">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs h-9 bg-background"
                placeholder="Date"
                aria-label="Filter by date"
              />
            </div>
            {(dateFilter || routeFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter("");
                  setRouteFilter("ALL");
                }}
                className="text-xs text-muted-foreground hover:text-foreground h-9"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Bulk Action Toolbar */}
      <ScheduleBulkToolbar
        selectedCount={selectedCount}
        totalCount={totalCount}
        displayedCount={schedules.length}
        isBulkOperating={isBulkOperating}
        bulkActionType={bulkActionType}
        onBulkSetStatus={handleBulkSetStatus}
        onOpenBulkDelete={() => setIsBulkDeleteModalOpen(true)}
        onClearSelection={clearSelection}
      />

      {/* Main Content: Loading, Error, Empty, or Table */}
      {isSchedulesLoading && schedules.length === 0 ? (
        <Card className="border-border/80 bg-card p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold text-muted-foreground">
              Loading schedules & passenger manifests...
            </p>
          </div>
        </Card>
      ) : isSchedulesError ? (
        <Card className="border-rose-200/80 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20 p-8 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Failed to load schedules
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-sm">
              {schedulesError?.message ?? "A network error occurred while retrieving departure timetables."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetchSchedules()}
              className="mt-2 text-xs"
            >
              Retry
            </Button>
          </div>
        </Card>
      ) : schedules.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-2xl p-12 text-center bg-card flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No departure schedules found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {activeTab !== "all" || routeFilter !== "ALL" || dateFilter
              ? "No schedules match the selected filters."
              : "You haven't scheduled any ferry departures yet. Connect an active route with a registered ferry to schedule passenger trips."}
          </p>
          <Button
            onClick={handleOpenAddModal}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add First Ferry Schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <DashboardTableCard
            title="Ferry Departure Schedules"
            headerRight={
              selectedCount > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs font-medium">
                    {selectedCount} selected
                  </span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="cursor-pointer text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Clear
                  </button>
                </div>
              ) : undefined
            }
            columns={columns}
            data={schedules}
            keyExtractor={(item) => item.id}
            rowClassName={(item) =>
              selectedScheduleIds.has(item.id)
                ? "bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40 border-l-2 border-l-emerald-600 dark:border-l-emerald-400"
                : undefined
            }
          />

          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            itemName="schedules"
            isLoading={isSchedulesFetching}
          />
        </div>
      )}

      {/* Schedule Form Modal (Add & Edit) */}
      <ScheduleFormModal
        isOpen={isAddModalOpen || !!editingSchedule}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingSchedule(null);
        }}
        editingSchedule={editingSchedule}
        routes={routesData?.routes ?? []}
        ferries={ferriesData?.ferries ?? []}
        isRoutesLoading={isRoutesLoading}
        isFerriesLoading={isFerriesLoading}
        onSubmitCreate={handleCreateSchedule}
        onSubmitUpdate={handleUpdateSchedule}
        isSubmitting={
          createScheduleMutation.isPending ||
          updateScheduleMutation.isPending ||
          updateStatusMutation.isPending
        }
      />

      {/* Schedule Delete Dialogs (Single & Bulk) */}
      <ScheduleDeleteDialogs
        deletingSchedule={deletingSchedule}
        isBulkDeleteModalOpen={isBulkDeleteModalOpen}
        selectedCount={selectedCount}
        isBulkOperating={isBulkOperating}
        isDeletingSingle={deleteScheduleMutation.isPending}
        onCloseSingle={() => setDeletingSchedule(null)}
        onConfirmSingleDelete={handleDeleteSchedule}
        onCloseBulk={() => setIsBulkDeleteModalOpen(false)}
        onConfirmBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
