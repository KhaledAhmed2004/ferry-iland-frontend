"use client";

import * as React from "react";

import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  UserCheck,
  Users,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";
import { useTableSelection } from "@/hooks/use-table-selection";
import { useUpdateUserStatusMutation, useUsersQuery } from "@/hooks/use-users";

import {
  BulkActionToolbar,
  DashboardTableCard,
  PageHeader,
  StatCard,
  StatusBadge,
  TablePagination,
  TableToolbar,
  UserDetailsModal,
  type TableColumn
} from "@/widgets";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/ui";
import type { IAdminUserItem } from "@/types";

export default function AdminPassengersPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 350);

  const [statusTab, setStatusTab] = React.useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  // Selected user for details modal
  const [selectedUser, setSelectedUser] = React.useState<IAdminUserItem | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Single-passenger status confirmation modal state
  const [passengerForStatusChange, setPassengerForStatusChange] = React.useState<{
    passenger: IAdminUserItem;
    targetStatus: "ACTIVE" | "SUSPENDED";
  } | null>(null);
  const [isUpdatingSingleStatus, setIsUpdatingSingleStatus] = React.useState(false);

  const handleConfirmSingleStatusChange = async () => {
    if (!passengerForStatusChange || isUpdatingSingleStatus) return;
    const { passenger, targetStatus } = passengerForStatusChange;
    setIsUpdatingSingleStatus(true);
    try {
      await updateUserStatusMutation.mutateAsync({
        userId: passenger.id,
        status: targetStatus
      });
      toast.success(
        targetStatus === "SUSPENDED"
          ? `Suspended account for ${passenger.name || passenger.email}`
          : `Activated account for ${passenger.name || passenger.email}`
      );
      setPassengerForStatusChange(null);
      refetch();
    } catch {
      toast.error("Failed to update passenger status");
    } finally {
      setIsUpdatingSingleStatus(false);
    }
  };

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusTab]);

  const { data, isLoading, isError, error, refetch, isFetching } = useUsersQuery({
    page,
    limit,
    searchTerm: debouncedSearch.trim() || undefined,
    role: "USER",
    status: statusTab === "ALL" ? undefined : statusTab
  });

  // Filter out any non-passenger users from the directory
  const rawUsers = data?.users ?? [];
  const passengers = rawUsers.filter((u) => u.role !== "ADMIN" && u.role !== "OPERATOR");

  const meta = data?.meta ?? {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  };

  const totalCount = meta.total ?? passengers.length;
  const totalPages = Math.max(
    1,
    meta.totalPages ?? meta.totalPage ?? Math.ceil(totalCount / limit)
  );
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  // Keep page clamped if items are deleted or filtered
  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Sliced passengers for resilience if backend sends all users
  const displayedPassengers = React.useMemo(() => {
    if (passengers.length > limit) {
      const start = (currentPage - 1) * limit;
      return passengers.slice(start, start + limit);
    }
    return passengers;
  }, [passengers, currentPage, limit]);

  // Compute stat metrics for current batch
  const activeCount = passengers.filter((u) => u.status === "ACTIVE").length;
  const suspendedCount = passengers.filter((u) => u.status === "SUSPENDED").length;

  // Headless Bulk Selection Hook
  const {
    selectedIds: selectedPassengerIds,
    selectedCount,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    toggleRow: toggleSelectRow,
    toggleSelectAllCurrentPage,
    toggleSelectAllAcrossPages,
    clearSelection,
    selectedItems
  } = useTableSelection<IAdminUserItem>({
    items: displayedPassengers,
    allPageItems: passengers,
    idKey: "id"
  });

  const [isBulkOperating, setIsBulkOperating] = React.useState(false);
  const [bulkActionType, setBulkActionType] = React.useState<"activate" | "suspend" | null>(null);

  const updateUserStatusMutation = useUpdateUserStatusMutation();

  // Reset selection on page, tab, or search change
  React.useEffect(() => {
    clearSelection();
  }, [page, statusTab, debouncedSearch, clearSelection]);

  // Bulk Status Update Handler
  const handleBulkStatusChange = async (targetStatus: "ACTIVE" | "SUSPENDED") => {
    if (selectedCount === 0 || isBulkOperating) return;
    setIsBulkOperating(true);
    setBulkActionType(targetStatus === "ACTIVE" ? "activate" : "suspend");

    const ids = Array.from(selectedPassengerIds);
    let successCount = 0;

    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          updateUserStatusMutation.mutateAsync({
            userId: id,
            status: targetStatus
          })
        )
      );

      results.forEach((r) => {
        if (r.status === "fulfilled") successCount++;
      });

      if (successCount > 0) {
        toast.success(
          `Successfully updated ${successCount} ${successCount === 1 ? "passenger" : "passengers"} to ${
            targetStatus === "ACTIVE" ? "Active" : "Suspended"
          }`
        );
        refetch();
        clearSelection();
      } else {
        toast.error("Failed to update selected passengers.");
      }
    } catch {
      toast.error("An error occurred during bulk update.");
    } finally {
      setIsBulkOperating(false);
      setBulkActionType(null);
    }
  };

  // Bulk CSV Export Handler
  const handleBulkExportCSV = () => {
    if (selectedItems.length === 0) return;

    const headers = [
      "Passenger Name",
      "Email",
      "Phone",
      "Status",
      "Email Verified",
      "Registered Date"
    ];
    const rows = selectedItems.map((p) => [
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.email || "").replace(/"/g, '""')}"`,
      `"${(p.phoneNumber || p.phone || "").replace(/"/g, '""')}"`,
      `"${p.status || "ACTIVE"}"`,
      p.isEmailVerified ? "Verified" : "Pending",
      `"${new Date(p.createdAt).toLocaleDateString()}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `passengers_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selectedItems.length} passengers to CSV`);
  };

  const handleOpenDetails = (user: IAdminUserItem) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const passengerColumns: TableColumn<IAdminUserItem>[] = [
    {
      header: (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              isAllCurrentPageSelected ? true : isSomeCurrentPageSelected ? "indeterminate" : false
            }
            onCheckedChange={toggleSelectAllCurrentPage}
            aria-label="Select all passengers on current page"
          />
        </div>
      ),
      headerClassName: "w-10 px-3 text-center",
      className: "w-10 px-3 text-center",
      align: "center",
      cell: (item) => {
        const isChecked = selectedPassengerIds.has(item.id);
        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleSelectRow(item.id)}
              aria-label={`Select passenger ${item.name || item.email}`}
            />
          </div>
        );
      }
    },
    {
      header: "PASSENGER",
      cell: (item) => {
        const initials = item.name
          ? item.name.charAt(0).toUpperCase()
          : item.email.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-bold text-blue-600 dark:text-blue-400">
              {initials}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-foreground truncate text-xs font-bold sm:text-sm">
                  {item.name || "Unnamed Passenger"}
                </span>
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
      header: "PHONE NUMBER",
      cell: (item) => {
        const phone = item.phoneNumber || item.phone;
        return (
          <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
            {phone ? (
              <>
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{phone}</span>
              </>
            ) : (
              <span className="text-muted-foreground/60">—</span>
            )}
          </div>
        );
      }
    },
    {
      header: "VERIFICATION",
      align: "center",
      headerClassName: "text-center",
      cell: (item) => {
        return item.isEmailVerified ? (
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Verified</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <XCircle className="h-3.5 w-3.5" />
            <span>Pending</span>
          </div>
        );
      }
    },
    {
      header: "STATUS",
      cell: (item) => {
        const rawStatus = item.status;
        const formattedStatus =
          rawStatus === "ACTIVE"
            ? "Active"
            : rawStatus === "SUSPENDED"
              ? "Suspended"
              : rawStatus || "Active";
        return <StatusBadge status={formattedStatus} />;
      }
    },
    {
      header: "REGISTERED",
      cell: (item) => (
        <span className="text-muted-foreground font-mono text-xs">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "ACTION",
      align: "right",
      headerClassName: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDetails(item)}
            className="bg-primary/10 text-primary hover:bg-primary/20 h-8 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Details</span>
          </Button>

          {item.status === "ACTIVE" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setPassengerForStatusChange({
                  passenger: item,
                  targetStatus: "SUSPENDED"
                });
              }}
              className="h-8 cursor-pointer gap-1 rounded-lg px-2.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 hover:text-rose-700"
              title="Suspend Passenger"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Suspend</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setPassengerForStatusChange({
                  passenger: item,
                  targetStatus: "ACTIVE"
                });
              }}
              className="h-8 cursor-pointer gap-1 rounded-lg px-2.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/10 hover:text-emerald-700"
              title="Activate Passenger"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Activate</span>
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <PageHeader
        title="Passenger Management"
        description="Directory of registered travelers, ticket buyers, and passenger accounts."
      />

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Passengers"
          value={`${totalCount} ${totalCount === 1 ? "Passenger" : "Passengers"}`}
          description="Registered traveler accounts"
          icon={Users}
          variant="blue"
        />
        <StatCard
          label="Active Travelers"
          value={`${activeCount} ${activeCount === 1 ? "Active" : "Active"}`}
          description="Verified & active to travel"
          icon={UserCheck}
          variant="emerald"
          colorValue
        />
        <StatCard
          label="Suspended Accounts"
          value={`${suspendedCount} ${suspendedCount === 1 ? "Account" : "Accounts"}`}
          description="Restricted from booking"
          icon={XCircle}
          variant="rose"
          colorValue
        />
      </div>

      {/* Reusable Search & Status Toolbar */}
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by passenger name, email, or phone number..."
        activeTab={statusTab}
        onTabChange={setStatusTab}
        tabs={[
          { value: "ALL", label: "All Passengers", count: totalCount },
          { value: "ACTIVE", label: "Active", count: activeCount },
          { value: "SUSPENDED", label: "Suspended", count: suspendedCount }
        ]}
      />

      {/* Error State */}
      {isError && (
        <div className="border-destructive/20 bg-destructive/10 space-y-3 rounded-xl border p-6 text-center">
          <AlertCircle className="text-destructive mx-auto h-8 w-8" />
          <h2 className="text-foreground text-base font-bold">Failed to Load Passengers</h2>
          <p className="text-muted-foreground mx-auto max-w-md text-xs">
            {error?.message || "Could not retrieve passenger directory from the server."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2 text-xs">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
            {error?.message?.toLowerCase().includes("token") ||
            error?.message?.toLowerCase().includes("unauthorized") ? (
              <Button
                size="sm"
                onClick={() => (window.location.href = "/login")}
                className="bg-primary text-primary-foreground text-xs"
              >
                Log In as Admin
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="border-border/80 bg-card animate-pulse space-y-3 rounded-xl border p-6 shadow-xs">
          <div className="bg-muted mb-4 h-5 w-48 rounded" />
          <div className="bg-muted/60 h-12 w-full rounded-lg" />
          <div className="bg-muted/40 h-12 w-full rounded-lg" />
          <div className="bg-muted/60 h-12 w-full rounded-lg" />
          <div className="bg-muted/40 h-12 w-full rounded-lg" />
        </div>
      ) : (
        /* Passengers Table Card */
        <div className="space-y-3">
          {/* Standard Bulk Action Floating Toolbar */}
          <BulkActionToolbar
            selectedCount={selectedCount}
            totalCount={totalCount}
            displayedCount={displayedPassengers.length}
            itemLabel="passengers"
            badgeColor="blue"
            isOperating={isBulkOperating}
            operatingLabel={bulkActionType === "activate" ? "Activating..." : "Suspending..."}
            onClearSelection={clearSelection}
            onSelectAllAcrossPages={toggleSelectAllAcrossPages}
            isAllAcrossPagesSelected={selectedCount === totalCount && totalCount > 0}
            actions={[
              {
                label: "Activate",
                icon: <Check className="h-3.5 w-3.5 stroke-[2.5]" />,
                onClick: () => handleBulkStatusChange("ACTIVE"),
                isLoading: isBulkOperating && bulkActionType === "activate",
                className:
                  "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              },
              {
                label: "Suspend",
                icon: <AlertTriangle className="h-3.5 w-3.5" />,
                onClick: () => handleBulkStatusChange("SUSPENDED"),
                isLoading: isBulkOperating && bulkActionType === "suspend",
                className:
                  "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
              },
              {
                label: "Export CSV",
                icon: <Download className="h-3.5 w-3.5" />,
                onClick: handleBulkExportCSV,
                className:
                  "border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
              }
            ]}
          />

          <DashboardTableCard
            title={
              statusTab === "ALL"
                ? "All Registered Passengers"
                : statusTab === "ACTIVE"
                  ? "Active Passengers"
                  : "Suspended Passengers"
            }
            columns={passengerColumns}
            data={displayedPassengers}
            keyExtractor={(item) => item.id}
            emptyMessage={
              searchTerm || statusTab !== "ALL"
                ? "No passengers match the search criteria or selected status filter."
                : "No registered passengers found in the system."
            }
          />

          {/* Reusable Pagination Controls */}
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={limit}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            itemName="passengers"
            isLoading={isFetching}
          />
        </div>
      )}

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
