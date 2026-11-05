"use client";

import * as React from "react";
import { AlertTriangle, Building2, Check, Copy, Download, Eye, Mail, Navigation, Ship, Users } from "lucide-react";
import { toast } from "sonner";

import {
  fetchAllAdminProviders,
  useAdminProvidersQuery,
  useUpdateProviderStatusMutation
} from "@/hooks/use-admin";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useTableState } from "@/hooks/use-table-state";
import { useUserStatsQuery } from "@/hooks/use-users";
import { datedCsvName, downloadCsv } from "@/lib/csv";
import type { IAdminProviderItem } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui";
import {
  BulkActionToolbar,
  DataTable,
  PageHeader,
  StatCard,
  StatCardGridSkeleton,
  StatusBadge,
  TableToolbar,
  type DataTableColumn,
  DataTableRowActions
} from "@/widgets";

type StatusTab = "ALL" | "ACTIVE" | "SUSPENDED";
type BulkAction = "activate" | "suspend" | "select-all";

const getProviderId = (provider: IAdminProviderItem) => provider.id;

const formatStatus = (status?: string) =>
  status === "ACTIVE" ? "Active" : status === "SUSPENDED" ? "Suspended" : status || "Active";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function AdminOperatorsPage() {
  const table = useTableState({
    filters: { status: "ALL" },
    defaultSort: { id: "createdAt", desc: true }
  });
  const statusTab = table.filters.status as StatusTab;
  const filterParams = {
    searchTerm: table.debouncedSearch.trim() || undefined,
    status: statusTab === "ALL" ? undefined : statusTab,
    sortBy: table.sortBy,
    sortOrder: table.sortOrder
  };

  const { data, isLoading, error, refetch, isFetching } = useAdminProvidersQuery({
    ...filterParams,
    page: table.page,
    limit: table.pageSize
  });
  const { data: statsData, isLoading: isStatsLoading } = useUserStatsQuery();

  const providers = React.useMemo(() => data?.providers ?? [], [data]);
  const matchingCount = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? data?.meta?.totalPage ?? 1;

  // Platform-wide numbers for the cards and tab badges (independent of search/paging).
  const totalOperators = statsData?.totalOperators ?? matchingCount;
  const suspendedCount = statsData?.suspendedOperators ?? 0;
  const activeCount = Math.max(0, totalOperators - suspendedCount);
  const totalFerries = statsData?.totalFerries ?? statsData?.totalFleets ?? 0;

  const selection = useRowSelection({
    data: providers,
    getRowId: getProviderId,
    resetKey: `${table.debouncedSearch}|${statusTab}`
  });

  const updateProviderStatus = useUpdateProviderStatusMutation();
  const [bulkAction, setBulkAction] = React.useState<BulkAction | null>(null);

  const handleBulkStatusChange = async (status: "ACTIVE" | "SUSPENDED") => {
    if (selection.selectedCount === 0 || bulkAction) return;
    setBulkAction(status === "ACTIVE" ? "activate" : "suspend");
    try {
      const results = await Promise.allSettled(
        selection.selectedIds.map((providerId) =>
          updateProviderStatus.mutateAsync({ providerId, payload: { status } })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        toast.success(
          `${status === "ACTIVE" ? "Activated" : "Suspended"} ${plural(succeeded, "operator", "operators")}`
        );
      }
      if (failed > 0) toast.error(`Failed to update ${plural(failed, "operator", "operators")}`);
      selection.clearSelection();
      void refetch();
    } finally {
      setBulkAction(null);
    }
  };

  const handleSelectAllMatching = async () => {
    setBulkAction("select-all");
    try {
      selection.selectRows(await fetchAllAdminProviders(filterParams));
    } catch {
      toast.error("Could not load every matching operator.");
    } finally {
      setBulkAction(null);
    }
  };

  const handleExportCsv = () => {
    const rows = selection.selectedRows;
    if (rows.length === 0) return;
    downloadCsv(
      datedCsvName("operators_export"),
      ["Company Name", "Contact Person", "Email", "Status", "Ferries", "Routes", "Registered Date"],
      rows.map((p) => [
        p.companyName,
        p.contactPersonName || p.user?.name,
        p.user?.email || p.contactEmail,
        p.user?.status || "ACTIVE",
        p.ferriesCount ?? 0,
        p.routesCount ?? 0,
        new Date(p.createdAt).toLocaleDateString()
      ])
    );
    toast.success(`Exported ${plural(rows.length, "operator", "operators")} to CSV`);
  };

  // Column ids double as the backend `sortBy` values.
  const columns = React.useMemo<DataTableColumn<IAdminProviderItem>[]>(
    () => [
      {
        id: "companyName",
        header: "Operator",
        accessorKey: "companyName",
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3">
              {/* Logo when the operator uploaded one, otherwise the building icon. */}
              <Avatar className="size-10 rounded-xl">
                {item.logoUrl && (
                  <AvatarImage
                    src={item.logoUrl}
                    alt={`${item.companyName} logo`}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Building2 className="size-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-foreground text-xs font-bold sm:text-sm">{item.companyName}</div>
                <div className="text-muted-foreground mt-0.5 text-[11px]">
                  {item.businessAddress || `Registered ${new Date(item.createdAt).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          );
        }
      },
      {
        id: "contactPersonName",
        header: "Contact & Email",
        accessorKey: "contactPersonName",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              <div className="text-foreground text-xs font-semibold">
                {item.contactPersonName || item.user?.name || "Direct Representative"}
              </div>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono text-[11px]">
                <Mail className="h-3 w-3 shrink-0" />
                <span>{item.user?.email || item.contactEmail || "No email available"}</span>
              </div>
            </div>
          );
        }
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (item) => item.user?.status,
        cell: ({ row }) => <StatusBadge status={formatStatus(row.original.user?.status)} />
      },
      {
        id: "ferriesCount",
        header: "Ferries",
        accessorKey: "ferriesCount",
        meta: { align: "center" },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1">
            <Ship className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold">{row.original.ferriesCount ?? 0}</span>
          </span>
        )
      },
      {
        id: "routesCount",
        header: "Routes",
        accessorKey: "routesCount",
        meta: { align: "center" },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1">
            <Navigation className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{row.original.routesCount ?? 0}</span>
          </span>
        )
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
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              {
                label: "Manage operator",
                icon: Eye,
                href: `/dashboard/admin/operators/${row.original.id}`
              },
              {
                label: "Copy email",
                icon: Copy,
                onSelect: () => {
                  const email = row.original.contactEmail ?? row.original.user?.email;
                  if (email) void navigator.clipboard.writeText(email);
                },
                separatorBefore: true
              }
            ]}
          />
        )
      }
    ],
    []
  );

  const isFiltered = Boolean(table.debouncedSearch) || statusTab !== "ALL";

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Ferry Operators Directory"
        description="Comprehensive roster of licensed ferry providers, vessel fleets, and sea transfer networks."
      />

      {isStatsLoading ? (
        <StatCardGridSkeleton
          count={3}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Operators"
          value={plural(totalOperators, "Operator", "Operators")}
          description="Licensed marine providers"
          icon={Building2}
          variant="blue"
        />
        <StatCard
          label="Suspended"
          value={plural(suspendedCount, "Operator", "Operators")}
          description="Restricted or under review"
          icon={Users}
          variant="rose"
          colorValue
        />
        <StatCard
          label="Total Ferries"
          value={plural(totalFerries, "Ferry", "Ferries")}
          description="Active transport vessels"
          icon={Ship}
          variant="emerald"
        />
      </div>
      )}

      <DataTable
        title="Registered Operators"
        itemName="operators"
        columns={columns}
        data={providers}
        getRowId={getProviderId}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        emptyMessage={
          isFiltered
            ? "No operators match the search query or status filter."
            : "No registered ferry operators found in the platform."
        }
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        enableColumnVisibility
        storageKey="admin-operators"
        initialColumnVisibility={{ createdAt: false }}
        enableRowSelection
        getRowLabel={(provider) => `operator ${provider.companyName}`}
        rowSelection={selection.rowSelection}
        onRowSelectionChange={selection.onRowSelectionChange}
        toolbar={
          <TableToolbar<StatusTab>
            countsLoading={isLoading || isStatsLoading}
            searchTerm={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search operators by company, contact person, or email..."
            activeTab={statusTab}
            onTabChange={(tab) => table.setFilter("status", tab)}
            tabs={[
              { value: "ALL", label: "All", count: totalOperators },
              { value: "ACTIVE", label: "Active", count: activeCount },
              { value: "SUSPENDED", label: "Suspended", count: suspendedCount }
            ]}
          />
        }
        bulkActions={
          <BulkActionToolbar
            selectedCount={selection.selectedCount}
            totalCount={matchingCount}
            displayedCount={providers.length}
            itemLabel="operators"
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
    </div>
  );
}
