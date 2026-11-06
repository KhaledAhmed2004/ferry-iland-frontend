"use client";

import * as React from "react";
import { Anchor, Navigation, Plus, Ship } from "lucide-react";

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
import { Button } from "@/ui";
import {
  DashboardTableCard,
  PageHeader,
  StatCard,
  StatCardGridSkeleton,
  TableToolbar
} from "@/widgets";

import { RouteBulkToolbar } from "./_components/RouteBulkToolbar";
import { RouteDeleteDialogs } from "./_components/RouteDeleteDialogs";
import { RouteFormModal } from "./_components/RouteFormModal";
import { getRouteColumns } from "./_components/routes-columns";

type StatusTab = "ALL" | "ACTIVE" | "INACTIVE";
const PAGE_SIZE = 10;

/**
 * Admin: platform routes. Routes are shared; operators pick one when they schedule a
 * trip on their own ferry, so creating, editing, pausing and deleting happens here only.
 */
export default function AdminRoutesPage() {
  const [statusFilter, setStatusFilter] = React.useState<StatusTab>("ALL");
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);

  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<IRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = React.useState<IRoute | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = React.useState(false);
  const [isBulkOperating, setIsBulkOperating] = React.useState(false);
  const [bulkActionType, setBulkActionType] = React.useState<
    "activate" | "deactivate" | "delete" | null
  >(null);

  // Every route (the network is small) for the counts and client-side search.
  const {
    data: allRoutesResponse,
    isLoading,
    isFetching,
    refetch
  } = useRoutesQuery({ limit: 100 });
  const { data: ports = [], isLoading: isPortsLoading } = usePortsQuery();

  const updateMutation = useUpdateRouteMutation();
  const deleteMutation = useDeleteRouteMutation();
  const bulkStatusMutation = useBulkUpdateRouteStatusMutation();
  const bulkDeleteMutation = useBulkDeleteRoutesMutation();

  const allRoutes = React.useMemo(() => allRoutesResponse?.routes ?? [], [allRoutesResponse]);
  const totalRoutesCount = allRoutesResponse?.pagination?.totalItems ?? allRoutes.length;
  const activeRoutesCount = allRoutes.filter((r) => r.status === "ACTIVE").length;
  const inactiveRoutesCount = allRoutes.filter((r) => r.status === "INACTIVE").length;

  const search = debouncedSearch.trim().toLowerCase();
  const filteredRoutes = React.useMemo(
    () =>
      allRoutes.filter((r) => {
        if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
        if (!search) return true;
        const haystack = [
          r.departurePort?.name,
          r.destinationPort?.name,
          r.description,
          ...(r.amenities ?? [])
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      }),
    [allRoutes, statusFilter, search]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const displayedRoutes = React.useMemo(
    () => filteredRoutes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredRoutes, currentPage]
  );

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
  } = useTableSelection({ items: displayedRoutes, allPageItems: filteredRoutes });

  const resetView = () => {
    setPage(1);
    clearSelection();
  };

  const handleOpenAdd = () => {
    setEditingRoute(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = React.useCallback((route: IRoute) => {
    setEditingRoute(route);
    setIsFormModalOpen(true);
  }, []);

  const handleToggleStatus = React.useCallback(
    (route: IRoute) => {
      updateMutation.mutate({
        id: route.id,
        payload: { status: route.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }
      });
    },
    [updateMutation]
  );

  const handleDeleteRoute = async () => {
    if (!deletingRoute) return;
    try {
      await deleteMutation.mutateAsync(deletingRoute.id);
      setDeletingRoute(null);
    } catch {
      // Toast comes from the mutation's onError.
    }
  };

  const runBulk = async (type: "activate" | "deactivate" | "delete") => {
    if (selectedRouteIds.size === 0 || isBulkOperating) return;
    const ids = Array.from(selectedRouteIds);
    setIsBulkOperating(true);
    setBulkActionType(type);
    try {
      if (type === "delete") {
        await bulkDeleteMutation.mutateAsync(ids);
        setIsBulkDeleteModalOpen(false);
      } else {
        await bulkStatusMutation.mutateAsync({
          ids,
          status: type === "activate" ? "ACTIVE" : "INACTIVE"
        });
      }
      setSelectedRouteIds(new Set());
    } catch {
      // Toast comes from the mutation's onError.
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
        onDelete: setDeletingRoute,
        onToggleStatus: handleToggleStatus
      }),
    [
      selectedRouteIds,
      isAllCurrentPageSelected,
      isSomeCurrentPageSelected,
      toggleSelectAllCurrentPage,
      toggleSelectRow,
      handleOpenEdit,
      handleToggleStatus
    ]
  );

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Routes"
        description="Platform ferry routes. Operators pick one of these when they schedule a trip on their ferry."
        actions={
          <Button onClick={handleOpenAdd} size="sm">
            <Plus />
            Add Route
          </Button>
        }
      />

      {isLoading ? (
        <StatCardGridSkeleton count={3} className="grid grid-cols-1 gap-4 sm:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Routes"
            value={totalRoutesCount}
            description="Port-to-port connections"
            icon={Navigation}
            variant="emerald"
          />
          <StatCard
            title="Active Routes"
            value={activeRoutesCount}
            description="Open for new trips"
            icon={Ship}
            variant="emerald"
            colorValue
          />
          <StatCard
            title="Paused Routes"
            value={inactiveRoutesCount}
            description="No new trips can be scheduled"
            icon={Anchor}
            variant="amber"
            colorValue
          />
        </div>
      )}

      <DashboardTableCard
        title="Platform Routes"
        itemName="routes"
        enableColumnVisibility
        toolbar={
          <TableToolbar<StatusTab>
            countsLoading={isLoading}
            searchTerm={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              resetView();
            }}
            searchPlaceholder="Search routes by port, description..."
            activeTab={statusFilter}
            onTabChange={(tab) => {
              setStatusFilter(tab);
              resetView();
            }}
            tabs={[
              { value: "ALL", label: "All", count: totalRoutesCount },
              { value: "ACTIVE", label: "Active", count: activeRoutesCount },
              { value: "INACTIVE", label: "Paused", count: inactiveRoutesCount }
            ]}
          />
        }
        bulkActions={
          selectedCount > 0 ? (
            <RouteBulkToolbar
              selectedCount={selectedCount}
              totalCount={filteredRoutes.length}
              displayedCount={displayedRoutes.length}
              isAllCurrentPageSelected={isAllCurrentPageSelected}
              onSelectAllAcrossPages={toggleSelectAllAcrossPages}
              onBulkActivate={() => runBulk("activate")}
              onBulkDeactivate={() => runBulk("deactivate")}
              onOpenBulkDelete={() => setIsBulkDeleteModalOpen(true)}
              onClearSelection={clearSelection}
              isBulkOperating={isBulkOperating}
              bulkActionType={bulkActionType}
            />
          ) : null
        }
        pagination={{
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalCount: filteredRoutes.length,
          totalPages,
          onPageChange: setPage
        }}
        columns={routeColumns}
        data={displayedRoutes}
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        keyExtractor={(item) => item.id}
        emptyMessage={
          search || statusFilter !== "ALL"
            ? "No routes match your search."
            : "No routes yet. Click 'Add Route' to create the first one."
        }
      />

      <RouteFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingRoute(null);
        }}
        routeToEdit={editingRoute}
        ports={ports}
        isPortsLoading={isPortsLoading}
        onSuccess={() => void refetch()}
      />

      <RouteDeleteDialogs
        deletingRoute={deletingRoute}
        onCloseSingle={() => setDeletingRoute(null)}
        onConfirmSingle={handleDeleteRoute}
        isSingleDeleting={deleteMutation.isPending}
        isBulkOpen={isBulkDeleteModalOpen}
        onCloseBulk={() => setIsBulkDeleteModalOpen(false)}
        onConfirmBulk={() => runBulk("delete")}
        selectedCount={selectedCount}
        selectedRoutesList={selectedRoutesList}
        isBulkOperating={isBulkOperating}
      />
    </div>
  );
}
