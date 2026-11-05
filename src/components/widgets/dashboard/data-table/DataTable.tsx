"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type VisibilityState
} from "@tanstack/react-table";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/ui";

import type { PageSizeOption } from "./TablePagination";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import { DataTableSkeletonRows, SkeletonCell, type SkeletonCellKind } from "./DataTableSkeleton";
import { DataTablePaginationBar } from "./DataTablePagination";
import { DataTableViewOptions } from "./DataTableViewOptions";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Text alignment for header and cells. */
    align?: "left" | "center" | "right";
    /** Extra classes for every body cell in this column. */
    className?: string;
    /** Extra classes for the header cell. */
    headerClassName?: string;
    /** Name shown in the column-visibility menu (defaults to the header string or id). */
    label?: string;
    /** Loading placeholder shape; inferred from the column id when omitted. */
    skeleton?: "select" | "actions" | "text";
  }
}

export type DataTableColumn<T> = ColumnDef<T, unknown>;

export interface DataTablePagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: PageSizeOption[];
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Stable row id — required so selection survives paging and refetches. */
  getRowId: (row: T) => string;

  title?: React.ReactNode;
  headerRight?: React.ReactNode;
  /** Rendered above the card (search, filters, tabs). */
  toolbar?: React.ReactNode;
  itemName?: string;
  emptyMessage?: React.ReactNode;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;

  isLoading?: boolean;
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;

  /** Controlled sorting. Pass with `manualSorting` when the server sorts. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** true = server sorts (default when `onSortingChange` is given); false = sort the loaded rows. */
  manualSorting?: boolean;

  pagination?: DataTablePagination;

  enableRowSelection?: boolean | ((row: T) => boolean);
  /** Accessible name for a row checkbox: "operator Acme" gives "Select operator Acme". */
  getRowLabel?: (row: T) => string;
  /** Controlled selection — use `useRowSelection()` so it survives paging. */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  /** Rendered between the toolbar and the table (e.g. `<BulkActionToolbar>`). */
  bulkActions?: React.ReactNode;

  /** Show the "Columns" menu. Hidden columns are remembered per `storageKey`. */
  enableColumnVisibility?: boolean;
  storageKey?: string;
  initialColumnVisibility?: VisibilityState;
}

const SELECT_COLUMN_ID = "__select";
const SKELETON_ROWS = 6;
/** Refetches faster than this show no loading state at all. */
const REFRESH_INDICATOR_DELAY_MS = 300;

/** `true` only once `active` has stayed true for `delayMs`; resets as soon as it turns false. */
function useDelayedFlag(active: boolean, delayMs: number) {
  const [elapsed, setElapsed] = React.useState(false);
  React.useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => {
      window.clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, delayMs]);
  return active && elapsed;
}

function readStoredVisibility(key: string | undefined): VisibilityState | undefined {
  if (!key || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(`table-columns:${key}`);
    return raw ? (JSON.parse(raw) as VisibilityState) : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredVisibility(key: string | undefined, value: VisibilityState) {
  if (!key) return;
  try {
    window.localStorage.setItem(`table-columns:${key}`, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode etc.) — visibility just won't persist.
  }
}

function skeletonKindOf<T>(column: { id: string; columnDef: DataTableColumn<T> }): SkeletonCellKind {
  const meta = column.columnDef.meta;
  if (meta?.skeleton) return meta.skeleton;
  if (column.id === SELECT_COLUMN_ID) return "select";
  if (/^actions?$/i.test(column.id)) return "actions";
  return "text";
}

function alignClass(align?: "left" | "center" | "right") {
  return align === "center" ? "text-center" : align === "right" ? "text-right" : undefined;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  title,
  headerRight,
  toolbar,
  itemName = "items",
  emptyMessage = "No data available.",
  className,
  rowClassName,
  onRowClick,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  sorting: controlledSorting,
  onSortingChange,
  manualSorting,
  pagination,
  enableRowSelection = false,
  getRowLabel,
  rowSelection: controlledSelection,
  onRowSelectionChange,
  bulkActions,
  enableColumnVisibility = false,
  storageKey,
  initialColumnVisibility
}: DataTableProps<T>) {
  const isServerSorted = manualSorting ?? Boolean(onSortingChange);

  const [localSorting, setLocalSorting] = React.useState<SortingState>([]);
  const sorting = controlledSorting ?? localSorting;

  const [localSelection, setLocalSelection] = React.useState<RowSelectionState>({});
  const rowSelection = controlledSelection ?? localSelection;
  const setRowSelection = onRowSelectionChange ?? setLocalSelection;

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialColumnVisibility ?? {}
  );
  // Hydrate after mount so server and client render the same markup.
  React.useEffect(() => {
    const stored = readStoredVisibility(storageKey);
    if (stored) setColumnVisibility(stored);
  }, [storageKey]);

  const handleVisibilityChange = React.useCallback<OnChangeFn<VisibilityState>>(
    (updater) => {
      setColumnVisibility((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeStoredVisibility(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const allColumns = React.useMemo<DataTableColumn<T>[]>(() => {
    if (!enableRowSelection) return columns;
    const selectColumn: DataTableColumn<T> = {
      id: SELECT_COLUMN_ID,
      enableSorting: false,
      enableHiding: false,
      meta: { className: "w-10", headerClassName: "w-10" },
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(event) => event.stopPropagation()}
          aria-label={getRowLabel ? `Select ${getRowLabel(row.original)}` : "Select row"}
        />
      )
    };
    return [selectColumn, ...columns];
  }, [columns, enableRowSelection, getRowLabel]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId: (row) => getRowId(row),
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: onSortingChange ?? setLocalSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: handleVisibilityChange,
    manualSorting: isServerSorted,
    manualPagination: true,
    enableMultiSort: false,
    enableHiding: enableColumnVisibility,
    enableSortingRemoval: true,
    enableRowSelection:
      typeof enableRowSelection === "function"
        ? (row) => enableRowSelection(row.original)
        : enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    ...(isServerSorted ? {} : { getSortedRowModel: getSortedRowModel() })
  });

  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : "Failed to load data."
    : null;

  const columnsMenu = enableColumnVisibility && <DataTableViewOptions table={table} />;
  const selectedCount = enableRowSelection ? Object.keys(rowSelection).length : 0;

  // A refetch (sort, filter, page change) keeps the old rows on screen. Like the shadcn
  // demo, a quick response just swaps the rows in with no loading state; only a refetch
  // slower than REFRESH_INDICATOR_DELAY_MS hides the old values behind per-cell skeletons
  // (same table size, so nothing jumps).
  const isRefreshing = useDelayedFlag(isFetching && !isLoading, REFRESH_INDICATOR_DELAY_MS);
  const hasToolbarRow = Boolean(toolbar || title || headerRight || columnsMenu);

  return (
    <div className={cn("w-full", className)}>
      {hasToolbarRow && (
        <div className="flex flex-wrap items-center gap-2 py-4">
          {toolbar ??
            (typeof title === "string" ? (
              <h3 className="text-sm font-medium">{title}</h3>
            ) : (
              title
            ))}
          <div className="ml-auto flex items-center gap-2">
            {headerRight}
            {columnsMenu}
          </div>
        </div>
      )}

      {/* empty:hidden — a bulk bar that renders nothing must not leave a gap. */}
      {bulkActions && <div className="pb-4 empty:hidden">{bulkActions}</div>}

      {errorMessage && (
        <div
          role="alert"
          className="border-destructive/30 text-destructive mb-4 flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}

      <div className="relative overflow-hidden rounded-lg border" aria-busy={isLoading || isRefreshing}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sorted = header.column.getIsSorted();
                  const content = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext());

                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                      }
                      className={cn(alignClass(meta?.align), meta?.headerClassName)}
                    >
                      {content !== null &&
                      header.column.id !== SELECT_COLUMN_ID &&
                      header.column.getCanSort() ? (
                        <DataTableColumnHeader column={header.column} title={content} />
                      ) : (
                        content
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={cn(isRefreshing && "pointer-events-none")}>
            {isLoading ? (
              <DataTableSkeletonRows
                rows={Math.min(pagination?.pageSize ?? SKELETON_ROWS, SKELETON_ROWS)}
                kinds={table.getVisibleLeafColumns().map(skeletonKindOf)}
              />
            ) : rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer", rowClassName?.(row.original))}
                >
                  {row.getVisibleCells().map((cell, colIdx) => {
                    const meta = cell.column.columnDef.meta;
                    const content = flexRender(cell.column.columnDef.cell, cell.getContext());
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(alignClass(meta?.align), meta?.className, isRefreshing && "relative")}
                      >
                        {isRefreshing ? (
                          <>
                            {/* display:contents keeps the layout; visibility hides the old values. */}
                            <span className="invisible contents">{content}</span>
                            <span aria-hidden className="absolute inset-0 flex items-center px-2">
                              <SkeletonCell kind={skeletonKindOf(cell.column)} index={colIdx + row.index} />
                            </span>
                          </>
                        ) : (
                          content
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <DataTablePaginationBar
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          totalPages={
            pagination.totalPages ?? Math.ceil(pagination.totalCount / Math.max(1, pagination.pageSize))
          }
          onPageChange={pagination.onPageChange}
          showSelection={Boolean(enableRowSelection)}
          selectedCount={selectedCount}
          itemName={itemName}
          isLoading={isLoading || isFetching}
        />
      ) : enableRowSelection && rows.length > 0 ? (
        <div className="text-muted-foreground flex-1 py-4 text-sm">
          {selectedCount} of {rows.length} row(s) selected.
        </div>
      ) : null}
    </div>
  );
}
