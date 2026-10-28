"use client";

import * as React from "react";
import {
  AlertTriangle,
  Anchor,
  Loader2,
  Navigation,
  Plus,
  Search,
  Ship,
  X
} from "lucide-react";
import {
  useBulkDeleteRoutesMutation,
  useBulkUpdateRouteStatusMutation,
  useDebounce,
  useDeleteRouteMutation,
  usePortsQuery,
  useRoutesQuery,
  useTableSelection,
  useUpdateRouteMutation
} from "@/hooks";
import type { IRoute } from "@/types";
import { Button, Input, Tabs, TabsList, TabsTrigger } from "@/ui";
import { DashboardTableCard, OperatorStatCard, TablePagination } from "@/widgets";

import { RouteBulkToolbar } from "./_components/RouteBulkToolbar";
import { RouteDeleteDialogs } from "./_components/RouteDeleteDialogs";
import { RouteFormModal } from "./_components/RouteFormModal";
import { getRouteColumns } from "./_components/routes-columns";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 per page" },
  { value: "20", label: "20 per page" },
  { value: "50", label: "50 per page" }
];

export default function OperatorRoutesPage() {
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modals & form states
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<IRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = React.useState<IRoute | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = React.useState(false);

  // Pagination states
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Bulk action states
  const [isBulkOperating, setIsBulkOperating] = React.useState(false);
  const [bulkActionType, setBulkActionType] = React.useState<
    "activate" | "deactivate" | "delete" | null
  >(null);

  // Event-based filter and search handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
    clearSelection();
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setPage(1);
    clearSelection();
  };

  const handleStatusFilterChange = (val: "ALL" | "ACTIVE" | "INACTIVE") => {
    setStatusFilter(val);
    setPage(1);
    clearSelection();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    clearSelection();
  };

  // Overall stats query (to accurately count total, active, inactive across all pages)
  const { data: allRoutesResponse } = useRoutesQuery({
    limit: 100
  });

  // Paginated routes query
  const {
    data: routesResponse,
    isLoading: isRoutesLoading,
    isError: isRoutesError,
    error: routesError,
    refetch: refetchRoutes,
    isFetching: isRoutesFetching
  } = useRoutesQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: debouncedSearch.trim() || undefined,
    page,
    limit: pageSize
  });

  const { data: ports = [], isLoading: isPortsLoading } = usePortsQuery();

  // Mutations
  const updateMutation = useUpdateRouteMutation();
  const deleteMutation = useDeleteRouteMutation();
  const bulkStatusMutation = useBulkUpdateRouteStatusMutation();
  const bulkDeleteMutation = useBulkDeleteRoutesMutation();

  // Modals helpers
  const handleOpenAddModal = () => {
    setEditingRoute(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = React.useCallback((route: IRoute) => {
    setEditingRoute(route);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenDelete = React.useCallback((route: IRoute) => {
    setDeletingRoute(route);
  }, []);

  const handleFormSuccess = () => {
    void refetchRoutes();
  };

  const handleDeleteRoute = async () => {
    if (!deletingRoute) return;

    try {
      await deleteMutation.mutateAsync(deletingRoute.id);
      await refetchRoutes();
      setDeletingRoute(null);
    } catch {
      // Handled in mutation onError
    }
  };

  // Source all routes
  const routes = React.useMemo(() => routesResponse?.routes ?? [], [routesResponse?.routes]);
  const allRoutes = React.useMemo(
    () => allRoutesResponse?.routes ?? routes,
    [allRoutesResponse?.routes, routes]
  );
  const isSearching = Boolean(debouncedSearch.trim());
  const searchNormalized = debouncedSearch.trim().toLowerCase();

  // Filter routes based on search query and status filter
  const filteredRoutes = React.useMemo(() => {
    const baseList = isSearching ? allRoutes : routes;

    return baseList.filter((r) => {
      if (statusFilter === "ACTIVE" && r.status !== "ACTIVE") return false;
      if (statusFilter === "INACTIVE" && r.status !== "INACTIVE") return false;

      if (searchNormalized) {
        const depPort = ports.find((p) => p.id === r.departurePortId);
        const destPort = ports.find((p) => p.id === r.destinationPortId);
        const depName = (r.departurePort?.name || depPort?.name || "").toLowerCase();
        const destName = (r.destinationPort?.name || destPort?.name || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const amenities = Array.isArray(r.amenities) ? r.amenities.join(" ").toLowerCase() : "";
        const priceStr = r.basePrice ? `$${r.basePrice}` : "";

        const matches =
          depName.includes(searchNormalized) ||
          destName.includes(searchNormalized) ||
          desc.includes(searchNormalized) ||
          amenities.includes(searchNormalized) ||
          priceStr.includes(searchNormalized);

        if (!matches) return false;
      }

      return true;
    });
  }, [isSearching, allRoutes, routes, statusFilter, searchNormalized, ports]);

  // Aggregate Stats
  const totalRoutesCount = allRoutesResponse?.pagination?.totalItems ?? allRoutes.length;
  const activeRoutesCount = allRoutes.filter((r) => r.status === "ACTIVE").length;
  const inactiveRoutesCount = allRoutes.filter((r) => r.status === "INACTIVE").length;

  // Pagination calculations
  const meta = routesResponse?.pagination;
  const totalCount = isSearching
    ? filteredRoutes.length
    : (meta?.totalItems ?? (allRoutesResponse?.pagination?.totalItems ?? filteredRoutes.length));
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  // Paginated slice when searching client-side
  const displayedRoutes = React.useMemo(() => {
    if (isSearching) {
      return filteredRoutes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }
    return filteredRoutes;
  }, [isSearching, filteredRoutes, currentPage, pageSize]);

  // Selection Computations via useTableSelection hook
  const {
    selectedIds: selectedRouteIds,
    selectedCount,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    toggleRow: toggleSelectRow,
    toggleSelectAllCurrentPage,
    toggleSelectAllAcrossPages,
    clearSelection,
    setSelectedIds: setSelectedRouteIds,
    selectedItems: selectedRoutesList
  } = useTableSelection({
    items: displayedRoutes,
    allPageItems: allRoutesResponse?.routes ?? routes
  });

  // Bulk Handlers
  const handleBulkActivate = async () => {
    if (selectedRouteIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedRouteIds);
    setIsBulkOperating(true);
    setBulkActionType("activate");

    try {
      await bulkStatusMutation.mutateAsync({
        ids,
        status: "ACTIVE"
      });
      setSelectedRouteIds(new Set());
    } catch {
      // Handled in mutation onError
    } finally {
      setIsBulkOperating(false);
      setBulkActionType(null);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedRouteIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedRouteIds);
    setIsBulkOperating(true);
    setBulkActionType("deactivate");

    try {
      await bulkStatusMutation.mutateAsync({
        ids,
        status: "INACTIVE"
      });
      setSelectedRouteIds(new Set());
    } catch {
      // Handled in mutation onError
    } finally {
      setIsBulkOperating(false);
      setBulkActionType(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRouteIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedRouteIds);
    setIsBulkOperating(true);
    setBulkActionType("delete");

    try {
      await bulkDeleteMutation.mutateAsync(ids);
      setIsBulkDeleteModalOpen(false);
      setSelectedRouteIds(new Set());
    } catch {
      // Handled in mutation onError
    } finally {
      setIsBulkOperating(false);
      setBulkActionType(null);
    }
  };

  const routeColumns = React.useMemo(
    () =>
      getRouteColumns({
        selectedRouteIds,
        isAllCurrentPageSelected,
        isSomeCurrentPageSelected,
        toggleSelectAllCurrentPage,
        toggleSelectRow,
        onEdit: handleOpenEdit,
        onDelete: handleOpenDelete
      }),
    [
      selectedRouteIds,
      isAllCurrentPageSelected,
      isSomeCurrentPageSelected,
      toggleSelectAllCurrentPage,
      toggleSelectRow,
      handleOpenEdit,
      handleOpenDelete
    ]
  );

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Ferry Routes Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manage ferry routes, ports, travel times, descriptions, and included services.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="flex h-9 shrink-0 items-center gap-1.5 self-start bg-emerald-600 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Route
        </Button>
      </div>

      {/* Operational Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OperatorStatCard
          title="Total Routes"
          value={`${totalRoutesCount} ${totalRoutesCount === 1 ? "Route" : "Routes"}`}
          description="Active port-to-port connections"
          icon={Navigation}
          variant="emerald"
        />

        <OperatorStatCard
          title="Active Routes"
          value={`${activeRoutesCount} ${activeRoutesCount === 1 ? "Route" : "Routes"}`}
          description="Available for passenger sailings"
          icon={Ship}
          variant="emerald"
          colorValue
        />

        <OperatorStatCard
          title="Inactive Routes"
          value={`${inactiveRoutesCount} ${inactiveRoutesCount === 1 ? "Route" : "Routes"}`}
          description="Seasonal or service suspended"
          icon={Anchor}
          variant="amber"
          colorValue
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-card border-border/80 flex flex-col gap-3 rounded-xl border p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search routes by departure, arrival port, region..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="bg-background h-9 pl-9 pr-8 text-xs shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer p-0.5 rounded-full hover:bg-muted"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground text-xs font-semibold whitespace-nowrap">Filter:</span>
          <Tabs
            value={statusFilter}
            onValueChange={(val) => handleStatusFilterChange(val as "ALL" | "ACTIVE" | "INACTIVE")}
            className="w-auto"
          >
            <TabsList className="h-9">
              <TabsTrigger value="ALL" className="text-xs">
                All ({totalRoutesCount})
              </TabsTrigger>
              <TabsTrigger value="ACTIVE" className="text-xs">
                Active ({activeRoutesCount})
              </TabsTrigger>
              <TabsTrigger value="INACTIVE" className="text-xs">
                Inactive ({inactiveRoutesCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Routes Table */}
      {isRoutesLoading && routes.length === 0 ? (
        <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-xl border py-16 shadow-xs">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground text-sm font-medium">
            Loading ferry routes...
          </p>
        </div>
      ) : isRoutesError && routes.length === 0 ? (
        <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-xl border px-4 py-16 text-center shadow-xs">
          <AlertTriangle className="mb-2 h-8 w-8 text-rose-500" />
          <h3 className="text-foreground text-sm font-bold">Unable to load ferry routes</h3>
          <p className="mt-1 max-w-md text-xs font-medium text-rose-600 dark:text-rose-400">
            {routesError instanceof Error
              ? routesError.message
              : "Could not fetch routes from the server."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchRoutes()}
            className="mt-4 text-xs font-semibold"
          >
            Retry Connection
          </Button>
        </div>
      ) : displayedRoutes.length === 0 ? (
        isSearching ? (
          <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-xl border px-4 py-16 text-center shadow-xs">
            <div className="bg-muted text-muted-foreground mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-foreground text-base font-bold">No matching routes found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              No ferry routes match your search for &ldquo;
              <span className="text-foreground font-semibold">{searchTerm}</span>
              &rdquo;. Try searching for a different port name, atoll, or clear filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSearch}
              className="mt-4 h-8 cursor-pointer text-xs font-semibold"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear Search Query
            </Button>
          </div>
        ) : (
          <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-xl border px-4 py-16 text-center shadow-xs">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <Navigation className="h-6 w-6" />
            </div>
            <h3 className="text-foreground text-base font-bold">No ferry routes found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              Create your first maritime route connecting departure and arrival ports to start
              scheduling passenger trips.
            </p>
            <Button
              onClick={handleOpenAddModal}
              className="mt-4 h-9 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Route
            </Button>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* Bulk Action Sticky / Floating Toolbar */}
          <RouteBulkToolbar
            selectedCount={selectedCount}
            totalCount={totalCount}
            displayedCount={displayedRoutes.length}
            isAllCurrentPageSelected={isAllCurrentPageSelected}
            onSelectAllAcrossPages={toggleSelectAllAcrossPages}
            onBulkActivate={handleBulkActivate}
            onBulkDeactivate={handleBulkDeactivate}
            onOpenBulkDelete={() => setIsBulkDeleteModalOpen(true)}
            onClearSelection={clearSelection}
            isBulkOperating={isBulkOperating}
            bulkActionType={bulkActionType}
          />

          <DashboardTableCard
            title="Ferry Routes Network"
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
            columns={routeColumns}
            data={displayedRoutes}
            keyExtractor={(item) => item.id}
            rowClassName={(item) =>
              selectedRouteIds.has(item.id)
                ? "bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40 border-l-2 border-l-emerald-600 dark:border-l-emerald-400"
                : undefined
            }
          />

          {/* Reusable Pagination Controls */}
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            itemName={isSearching ? "matching routes" : "routes"}
            isLoading={isRoutesFetching}
          />
        </div>
      )}

      {/* Unified Add / Edit Route Modal */}
      <RouteFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingRoute(null);
        }}
        routeToEdit={editingRoute}
        ports={ports}
        isPortsLoading={isPortsLoading}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialogs (Single & Bulk) */}
      <RouteDeleteDialogs
        deletingRoute={deletingRoute}
        onCloseSingle={() => setDeletingRoute(null)}
        onConfirmSingle={handleDeleteRoute}
        isSingleDeleting={deleteMutation.isPending}
        isBulkOpen={isBulkDeleteModalOpen}
        onCloseBulk={() => setIsBulkDeleteModalOpen(false)}
        onConfirmBulk={handleBulkDelete}
        selectedCount={selectedCount}
        selectedRoutesList={selectedRoutesList}
        isBulkOperating={isBulkOperating}
      />
    </div>
  );
}
