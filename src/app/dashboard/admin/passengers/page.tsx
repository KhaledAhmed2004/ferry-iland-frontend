"use client";

import * as React from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Mail,
  Phone,
  Users,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

import { useRowSelection } from "@/hooks/use-row-selection";
import { useTableState } from "@/hooks/use-table-state";
import {
  fetchAllUsers,
  useUpdateUserStatusMutation,
  useUsersQuery,
  useUserStatsQuery
} from "@/hooks/use-users";
import { datedCsvName, downloadCsv } from "@/lib/csv";
import type { IAdminUserItem } from "@/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/ui";
import {
  BulkActionToolbar,
  DataTable,
  PageHeader,
  StatCard,
  StatCardGridSkeleton,
  StatusBadge,
  TableToolbar,
  UserDetailsModal,
  type DataTableColumn,
  DataTableRowActions
} from "@/widgets";

type StatusTab = "ALL" | "ACTIVE" | "SUSPENDED";
type BulkAction = "activate" | "suspend" | "select-all";

const getUserId = (user: IAdminUserItem) => user.id;

const formatStatus = (status?: string) =>
  status === "ACTIVE" ? "Active" : status === "SUSPENDED" ? "Suspended" : status || "Active";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const TABLE_TITLES: Record<StatusTab, string> = {
  ALL: "All Registered Passengers",
  ACTIVE: "Active Passengers",
  SUSPENDED: "Suspended Passengers"
};

export default function AdminPassengersPage() {
  const table = useTableState({
    filters: { status: "ALL" },
    defaultSort: { id: "createdAt", desc: true }
  });
  const statusTab = table.filters.status as StatusTab;
  const filterParams = {
    searchTerm: table.debouncedSearch.trim() || undefined,
    role: "USER",
    status: statusTab === "ALL" ? undefined : statusTab,
    sortBy: table.sortBy,
    sortOrder: table.sortOrder
  };

  const { data, isLoading, error, refetch, isFetching } = useUsersQuery({
    ...filterParams,
    page: table.page,
    limit: table.pageSize
  });
  const { data: statsData, isLoading: isStatsLoading } = useUserStatsQuery();

  const passengers = React.useMemo(() => data?.users ?? [], [data]);
  const matchingCount = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? data?.meta?.totalPage ?? 1;

  // Platform-wide numbers for the cards and tab badges (independent of search/paging).
  const totalPassengers = statsData?.totalPassengers ?? matchingCount;
  const suspendedCount = statsData?.suspendedPassengers ?? 0;
  const activeCount = Math.max(0, totalPassengers - suspendedCount);

  const selection = useRowSelection({
    data: passengers,
    getRowId: getUserId,
    resetKey: `${table.debouncedSearch}|${statusTab}`
  });

  // Details modal
  const [selectedUser, setSelectedUser] = React.useState<IAdminUserItem | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Single-passenger status confirmation
  const [passengerForStatusChange, setPassengerForStatusChange] = React.useState<{
    passenger: IAdminUserItem;
    targetStatus: "ACTIVE" | "SUSPENDED";
  } | null>(null);
  const [isUpdatingSingleStatus, setIsUpdatingSingleStatus] = React.useState(false);

  const updateUserStatusMutation = useUpdateUserStatusMutation();
  const [bulkAction, setBulkAction] = React.useState<BulkAction | null>(null);

  const handleConfirmSingleStatusChange = async () => {
    if (!passengerForStatusChange || isUpdatingSingleStatus) return;
    const { passenger, targetStatus } = passengerForStatusChange;
    setIsUpdatingSingleStatus(true);
    try {
      await updateUserStatusMutation.mutateAsync({ userId: passenger.id, status: targetStatus });
      toast.success(
        `${targetStatus === "SUSPENDED" ? "Suspended" : "Activated"} account for ${passenger.name || passenger.email}`
      );
      setPassengerForStatusChange(null);
      void refetch();
    } catch {
      toast.error("Failed to update passenger status");
    } finally {
      setIsUpdatingSingleStatus(false);
    }
  };

  const handleBulkStatusChange = async (status: "ACTIVE" | "SUSPENDED") => {
    if (selection.selectedCount === 0 || bulkAction) return;
    setBulkAction(status === "ACTIVE" ? "activate" : "suspend");
    try {
      const results = await Promise.allSettled(
        selection.selectedIds.map((userId) => updateUserStatusMutation.mutateAsync({ userId, status }))
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        toast.success(
          `${status === "ACTIVE" ? "Activated" : "Suspended"} ${plural(succeeded, "passenger", "passengers")}`
        );
      }
      if (failed > 0) toast.error(`Failed to update ${plural(failed, "passenger", "passengers")}`);
      selection.clearSelection();
      void refetch();
    } finally {
      setBulkAction(null);
    }
  };

  const handleSelectAllMatching = async () => {
    setBulkAction("select-all");
    try {
      selection.selectRows(await fetchAllUsers(filterParams));
    } catch {
      toast.error("Could not load every matching passenger.");
    } finally {
      setBulkAction(null);
    }
  };

  const handleExportCsv = () => {
    const rows = selection.selectedRows;
    if (rows.length === 0) return;
    downloadCsv(
      datedCsvName("passengers_export"),
      ["Passenger Name", "Email", "Phone", "Status", "Email Verified", "Registered Date"],
      rows.map((p) => [
        p.name,
        p.email,
        p.phoneNumber || p.phone,
        p.status || "ACTIVE",
        p.isEmailVerified ? "Verified" : "Pending",
        new Date(p.createdAt).toLocaleDateString()
      ])
    );
    toast.success(`Exported ${plural(rows.length, "passenger", "passengers")} to CSV`);
  };

  // Column ids double as the backend sort fields.
  const columns = React.useMemo<DataTableColumn<IAdminUserItem>[]>(
    () => [
      {
        id: "name",
        header: "Passenger",
        accessorKey: "name",
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-bold text-blue-600 dark:text-blue-400">
                {(item.name || item.email).charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-foreground truncate text-xs font-bold sm:text-sm">
                  {item.name || "Unnamed Passenger"}
                </div>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-[11px]">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.email}</span>
                </div>
              </div>
            </div>
          );
        }
      },
      {
        id: "phoneNumber",
        header: "Phone Number",
        accessorFn: (item) => item.phoneNumber || item.phone,
        cell: ({ row }) => {
          const phone = row.original.phoneNumber || row.original.phone;
          return phone ? (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {phone}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          );
        }
      },
      {
        id: "isEmailVerified",
        header: "Verification",
        accessorKey: "isEmailVerified",
        meta: { align: "center" },
        cell: ({ row }) =>
          row.original.isEmailVerified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <XCircle className="h-3.5 w-3.5" />
              Pending
            </span>
          )
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge status={formatStatus(row.original.status)} />
      },
      {
        id: "createdAt",
        header: "Registered",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        )
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "right" },
        cell: ({ row }) => {
          const item = row.original;
          const isActive = item.status === "ACTIVE";
          return (
            <DataTableRowActions
              actions={[
                {
                  label: "View details",
                  icon: Eye,
                  onSelect: () => {
                    setSelectedUser(item);
                    setIsModalOpen(true);
                  }
                },
                {
                  label: isActive ? "Suspend passenger" : "Activate passenger",
                  icon: isActive ? Ban : CheckCircle2,
                  destructive: isActive,
                  separatorBefore: true,
                  onSelect: () =>
                    setPassengerForStatusChange({
                      passenger: item,
                      targetStatus: isActive ? "SUSPENDED" : "ACTIVE"
                    })
                }
              ]}
            />
          );
        }
      }
    ],
    []
  );

  const isFiltered = Boolean(table.debouncedSearch) || statusTab !== "ALL";

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Passenger Management"
        description="Directory of registered travelers, ticket buyers, and passenger accounts."
      />

      {isStatsLoading ? (
        <StatCardGridSkeleton count={2} className="grid grid-cols-1 gap-4 sm:grid-cols-2" />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Passengers"
          value={plural(totalPassengers, "Passenger", "Passengers")}
          description="Registered traveler accounts"
          icon={Users}
          variant="blue"
        />
        <StatCard
          label="Suspended Passengers"
          value={plural(suspendedCount, "Passenger", "Passengers")}
          description="Restricted from booking"
          icon={XCircle}
          variant="rose"
          colorValue
        />
      </div>
      )}

      <DataTable
        title={TABLE_TITLES[statusTab] ?? TABLE_TITLES.ALL}
        itemName="passengers"
        columns={columns}
        data={passengers}
        getRowId={getUserId}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        emptyMessage={
          isFiltered
            ? "No passengers match the search criteria or selected status filter."
            : "No registered passengers found in the system."
        }
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        enableColumnVisibility
        storageKey="admin-passengers"
        enableRowSelection
        rowSelection={selection.rowSelection}
        onRowSelectionChange={selection.onRowSelectionChange}
        toolbar={
          <TableToolbar<StatusTab>
            countsLoading={isLoading || isStatsLoading}
            searchTerm={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search by passenger name, email, or phone number..."
            activeTab={statusTab}
            onTabChange={(tab) => table.setFilter("status", tab)}
            tabs={[
              { value: "ALL", label: "All Passengers", count: totalPassengers },
              { value: "ACTIVE", label: "Active", count: activeCount },
              { value: "SUSPENDED", label: "Suspended", count: suspendedCount }
            ]}
          />
        }
        bulkActions={
          <BulkActionToolbar
            selectedCount={selection.selectedCount}
            totalCount={matchingCount}
            displayedCount={passengers.length}
            itemLabel="passengers"
            badgeColor="blue"
            isOperating={bulkAction !== null}
            operatingLabel={
              bulkAction === "activate"
                ? "Activating..."
                : bulkAction === "suspend"
                  ? "Suspending..."
                  : "Selecting..."
            }
            onClearSelection={selection.clearSelection}
            onSelectAllAcrossPages={handleSelectAllMatching}
            isAllAcrossPagesSelected={selection.selectedCount >= matchingCount && matchingCount > 0}
            actions={[
              {
                label: "Activate",
                icon: <Check className="h-3.5 w-3.5 stroke-[2.5]" />,
                onClick: () => handleBulkStatusChange("ACTIVE"),
                isLoading: bulkAction === "activate",
                className:
                  "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              },
              {
                label: "Suspend",
                icon: <AlertTriangle className="h-3.5 w-3.5" />,
                onClick: () => handleBulkStatusChange("SUSPENDED"),
                isLoading: bulkAction === "suspend",
                className:
                  "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
              },
              {
                label: "Export CSV",
                icon: <Download className="h-3.5 w-3.5" />,
                onClick: handleExportCsv,
                className:
                  "border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
              }
            ]}
          />
        }
        pagination={{
          page: table.page,
          pageSize: table.pageSize,
          totalCount: matchingCount,
          totalPages,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize
        }}
      />

      {/* User Details Modal Dialog */}
      <UserDetailsModal
        user={selectedUser}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onStatusChange={() => {
          refetch();
        }}
      />

      {/* Single Passenger Status Confirmation Modal */}
      <Dialog
        open={Boolean(passengerForStatusChange)}
        onOpenChange={(open) => {
          if (!open) setPassengerForStatusChange(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  passengerForStatusChange?.targetStatus === "SUSPENDED"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {passengerForStatusChange?.targetStatus === "SUSPENDED" ? (
                  <Ban className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-foreground text-base font-bold">
                  {passengerForStatusChange?.targetStatus === "SUSPENDED"
                    ? "Suspend Passenger Account"
                    : "Activate Passenger Account"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {passengerForStatusChange?.targetStatus === "SUSPENDED"
                    ? "This action will restrict the passenger from making bookings."
                    : "This action will restore full passenger booking privileges."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="text-muted-foreground space-y-3 py-2 text-xs">
            <p>
              Are you sure you want to{" "}
              <strong className="text-foreground">
                {passengerForStatusChange?.targetStatus === "SUSPENDED" ? "suspend" : "activate"}
              </strong>{" "}
              the account for{" "}
              <strong className="text-foreground">
                {passengerForStatusChange?.passenger.name ||
                  passengerForStatusChange?.passenger.email}
              </strong>
              ?
            </p>
            {passengerForStatusChange?.targetStatus === "SUSPENDED" ? (
              <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                The traveler will no longer be able to log in, search available ferries, or purchase
                digital boarding passes until reactivated by an administrator.
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                The traveler will regain access to search routes, purchase tickets, and view
                reservation history.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdatingSingleStatus}
              onClick={() => setPassengerForStatusChange(null)}
              className="cursor-pointer text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant={
                passengerForStatusChange?.targetStatus === "SUSPENDED" ? "destructive" : "default"
              }
              size="sm"
              disabled={isUpdatingSingleStatus}
              onClick={handleConfirmSingleStatusChange}
              className={`cursor-pointer text-xs font-semibold ${
                passengerForStatusChange?.targetStatus === "ACTIVE"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : ""
              }`}
            >
              {isUpdatingSingleStatus ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {passengerForStatusChange?.targetStatus === "SUSPENDED"
                ? "Yes, Suspend Account"
                : "Yes, Activate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
