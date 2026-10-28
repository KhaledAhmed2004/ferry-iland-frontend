"use client";

import * as React from "react";
import {
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Ship,
  Users,
  Wrench,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateFerryMutation,
  useDebounce,
  useDeleteFerryMutation,
  useFerriesQuery,
  useFerryStatsQuery,
  useTableSelection,
  useUpdateFerryMutation
} from "@/hooks";
import type {
  ICreateFerryPayload,
  IFerry,
  IUpdateFerryPayload,
  VesselStatus,
  VesselType
} from "@/types";
import {
  Button,
  Card,
  Input,
  ReusableSelect
} from "@/ui";
import {
  DashboardTableCard,
  StatCard,
  TablePagination
} from "@/widgets";

import { FerryBulkToolbar } from "./_components/FerryBulkToolbar";
import { FerryDeleteDialogs } from "./_components/FerryDeleteDialogs";
import { FerryFormModal } from "./_components/FerryFormModal";
import {
  getFerryColumns,
  getFerryImage,
  formatFerryType,
  formatFerryStatus,
  SUGGESTED_VESSEL_AMENITIES
} from "./_components/ferries-columns";

export { getFerryImage, formatFerryType, formatFerryStatus, SUGGESTED_VESSEL_AMENITIES };

const FERRY_TYPE_OPTIONS = [
  { value: "ALL", label: "All Ferry Types" },
  { value: "CATAMARAN", label: "Catamaran (High-Speed)" },
  { value: "SPEEDBOAT", label: "Speedboat (Express)" },
  { value: "TRADITIONAL_FERRY", label: "Traditional Ferry" }
];

const FERRY_STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "IN_SERVICE", label: "In Service" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OUT_OF_SERVICE", label: "Out of Service" }
];

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 per page" },
  { value: "20", label: "20 per page" },
  { value: "50", label: "50 per page" }
];

export default function OperatorFerriesPage() {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination state
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Bulk action state
  const [isBulkOperating, setIsBulkOperating] = React.useState(false);
  const [bulkActionType, setBulkActionType] = React.useState<
    "in_service" | "maintenance" | "out_of_service" | "delete" | null
  >(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = React.useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingFerry, setEditingFerry] = React.useState<IFerry | null>(null);
  const [deletingFerry, setDeletingFerry] = React.useState<IFerry | null>(null);

  // Reset page whenever filter changes (guarded against initial mount)
  const isFirstMount = React.useRef(true);
  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setPage(1);
    clearSelection();
  }, [debouncedSearch, selectedType, selectedStatus, pageSize]);

  // Fetch queries
  const { data: statsData } = useFerryStatsQuery();

  const {
    data: ferriesData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useFerriesQuery({
    search: debouncedSearch.trim() || undefined,
    type: selectedType === "ALL" ? undefined : (selectedType as VesselType),
    status: selectedStatus === "ALL" ? undefined : (selectedStatus as VesselStatus),
    page,
    limit: pageSize
  });

  // Mutations
  const createMutation = useCreateFerryMutation();
  const updateMutation = useUpdateFerryMutation();
  const deleteMutation = useDeleteFerryMutation();

  // Local ferries state for optimistic updates
  const [localFerries, setLocalFerries] = React.useState<IFerry[]>([]);

  React.useEffect(() => {
    if (ferriesData?.ferries) {
      setLocalFerries(ferriesData.ferries);
    }
  }, [ferriesData?.ferries]);

  // Pagination computations
  const totalCount = ferriesData?.meta?.total ?? localFerries.length;
  const totalPages = Math.max(1, ferriesData?.meta?.totalPages ?? Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const displayedFerries = React.useMemo(() => {
    if (localFerries.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return localFerries.slice(start, start + pageSize);
    }
    return localFerries;
  }, [localFerries, currentPage, pageSize]);

  const ferries = displayedFerries;

  // Keep page clamped ONLY when query has settled and is not in flight
  React.useEffect(() => {
    if (!isLoading && !isFetching && ferriesData && page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages, isLoading, isFetching, ferriesData]);

  // Selection Computations via headless hook
  const {
    selectedIds: selectedFerryIds,
    selectedCount,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    toggleRow: toggleSelectRow,
    toggleSelectAllCurrentPage,
    clearSelection
  } = useTableSelection({
    items: ferries
  });

  // Actions
  const handleOpenAdd = () => setIsAddModalOpen(true);
  const handleOpenEdit = React.useCallback((ferry: IFerry) => setEditingFerry(ferry), []);
  const handleOpenDelete = React.useCallback((ferry: IFerry) => setDeletingFerry(ferry), []);

  const handleCreateFerry = async (payload: ICreateFerryPayload) => {
    const res = await createMutation.mutateAsync(payload);
    if (res?.data) {
      const createdFerry = res.data;
      setLocalFerries((prev) => [createdFerry, ...prev]);
    }
    await refetch();
    setIsAddModalOpen(false);
  };

  const handleUpdateFerry = async (payload: IUpdateFerryPayload) => {
    if (!editingFerry) return;
    const res = await updateMutation.mutateAsync({
      id: editingFerry.id,
      payload
    });
    if (res?.data) {
      const updated = res.data;
      setLocalFerries((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    }
    await refetch();
    setEditingFerry(null);
  };

  const handleDeleteFerry = async () => {
    if (!deletingFerry) return;
    try {
      await deleteMutation.mutateAsync(deletingFerry.id);
      setLocalFerries((prev) => prev.filter((f) => f.id !== deletingFerry.id));
      await refetch();
      setDeletingFerry(null);
    } catch {
      // Handled in mutation onError
    }
  };

  // Bulk Handlers
  const handleBulkSetStatus = async (status: VesselStatus) => {
    if (selectedFerryIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedFerryIds);
    setIsBulkOperating(true);
    const actionKey =
      status === "IN_SERVICE"
        ? "in_service"
        : status === "MAINTENANCE"
          ? "maintenance"
          : "out_of_service";
    setBulkActionType(actionKey);

    const statusLabel = formatFerryStatus(status);
    const toastId = toast.loading(`Updating ${ids.length} ferries to ${statusLabel}...`);

    setLocalFerries((prev) =>
      prev.map((f) => (selectedFerryIds.has(f.id) ? { ...f, status } : f))
    );

    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        await updateMutation.mutateAsync({ id, payload: { status } });
        successCount++;
      } catch {
        failCount++;
      }
    }

    await refetch();
    setIsBulkOperating(false);
    setBulkActionType(null);
    clearSelection();

    if (failCount === 0) {
      toast.success(`Successfully updated ${successCount} ferries to ${statusLabel}!`, { id: toastId });
    } else {
      toast.warning(`Updated ${successCount} ferries (${failCount} failed)`, { id: toastId });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFerryIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedFerryIds);
    setIsBulkOperating(true);
    setBulkActionType("delete");

    const toastId = toast.loading(`Deleting ${ids.length} ferries...`);
    setLocalFerries((prev) => prev.filter((f) => !selectedFerryIds.has(f.id)));

    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync(id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    await refetch();
    setIsBulkOperating(false);
    setBulkActionType(null);
    setIsBulkDeleteModalOpen(false);
    clearSelection();

    if (failCount === 0) {
      toast.success(`Successfully deleted ${successCount} ferries!`, { id: toastId });
    } else {
      toast.warning(`Deleted ${successCount} ferries (${failCount} failed)`, { id: toastId });
    }
  };

  // Columns definition
  const columns = React.useMemo(() => {
    return getFerryColumns({
      selectedFerryIds,
      isAllCurrentPageSelected,
      isSomeCurrentPageSelected,
      toggleSelectAllCurrentPage,
      toggleSelectRow,
      onEdit: handleOpenEdit,
      onDelete: handleOpenDelete
    });
  }, [
    selectedFerryIds,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    toggleSelectAllCurrentPage,
    toggleSelectRow,
    handleOpenEdit,
    handleOpenDelete
  ]);

  // Aggregated Stats
  const inServiceCount =
    statsData?.inServiceFerries ?? ferries.filter((f) => f.status === "IN_SERVICE").length;
  const maintenanceCount =
    statsData?.maintenanceFerries ?? ferries.filter((f) => f.status === "MAINTENANCE").length;
  const totalCapacity =
    statsData?.totalCapacity ?? ferries.reduce((acc, f) => acc + (f.capacity || 0), 0);

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ferry Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manage your fleet of passenger speedboats, catamarans, and traditional ferries.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Ferry
        </Button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          title="Total Fleet"
          value={totalCount}
          description="Registered vessels"
          icon={Ship}
          variant="emerald"
        />
        <StatCard
          title="In Service"
          value={inServiceCount}
          description="Active sailing vessels"
          icon={ShieldCheck}
          variant="emerald"
        />
        <StatCard
          title="Maintenance"
          value={maintenanceCount}
          description="Under routine repairs"
          icon={Wrench}
          variant="amber"
        />
        <StatCard
          title="Total Capacity"
          value={totalCapacity}
          description="Passenger seats"
          icon={Users}
          variant="blue"
        />
      </div>

      {/* Search and Filters Bar */}
      <Card className="border-border/80 bg-card p-3.5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by vessel name or reg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-9 pl-8 bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5 cursor-pointer"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-full sm:w-44">
              <ReusableSelect
                value={selectedType}
                onValueChange={setSelectedType}
                options={FERRY_TYPE_OPTIONS}
                placeholder="Ferry Type"
              />
            </div>
            <div className="w-full sm:w-40">
              <ReusableSelect
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                options={FERRY_STATUS_OPTIONS}
                placeholder="Status"
              />
            </div>
            {(searchTerm || selectedType !== "ALL" || selectedStatus !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedType("ALL");
                  setSelectedStatus("ALL");
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
      <FerryBulkToolbar
        selectedCount={selectedCount}
        totalCount={totalCount}
        displayedCount={ferries.length}
        isBulkOperating={isBulkOperating}
        bulkActionType={bulkActionType}
        onBulkSetStatus={handleBulkSetStatus}
        onOpenBulkDelete={() => setIsBulkDeleteModalOpen(true)}
        onClearSelection={clearSelection}
      />

      {/* Main Table Content */}
      {isLoading && ferries.length === 0 ? (
        <Card className="border-border/80 bg-card p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold text-muted-foreground">
              Loading vessel fleet & capacities...
            </p>
          </div>
        </Card>
      ) : isError ? (
        <Card className="border-rose-200/80 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20 p-8 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Failed to load ferries
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-sm">
              {error?.message ?? "An error occurred while retrieving your fleet."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="mt-2 text-xs"
            >
              Retry
            </Button>
          </div>
        </Card>
      ) : ferries.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-2xl p-12 text-center bg-card flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
            <Ship className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No ferries found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {searchTerm || selectedType !== "ALL" || selectedStatus !== "ALL"
              ? "No ferries match your search and filter criteria."
              : "You haven't registered any ferries yet. Add your first vessel to assign it to departure routes."}
          </p>
          <Button
            onClick={handleOpenAdd}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add First Ferry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <DashboardTableCard
            title="Registered Fleet"
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
            data={ferries}
            keyExtractor={(item) => item.id}
            rowClassName={(item) =>
              selectedFerryIds.has(item.id)
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
            itemName="ferries"
            isLoading={isFetching}
          />
        </div>
      )}

      {/* Ferry Form Modal (Add & Edit) */}
      <FerryFormModal
        isOpen={isAddModalOpen || !!editingFerry}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingFerry(null);
        }}
        editingFerry={editingFerry}
        onSubmitCreate={handleCreateFerry}
        onSubmitUpdate={handleUpdateFerry}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Ferry Delete Dialogs (Single & Bulk) */}
      <FerryDeleteDialogs
        deletingFerry={deletingFerry}
        isBulkDeleteModalOpen={isBulkDeleteModalOpen}
        selectedCount={selectedCount}
        isBulkOperating={isBulkOperating}
        isDeletingSingle={deleteMutation.isPending}
        onCloseSingle={() => setDeletingFerry(null)}
        onConfirmSingleDelete={handleDeleteFerry}
        onCloseBulk={() => setIsBulkDeleteModalOpen(false)}
        onConfirmBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
