"use client";

import { DataTablePaginationBar } from "./DataTablePagination";

export interface PageSizeOption {
  value: string;
  label: string;
}

export const DEFAULT_PAGE_SIZE_OPTIONS: PageSizeOption[] = [
  { value: "10", label: "10 per page" },
  { value: "20", label: "20 per page" },
  { value: "50", label: "50 per page" }
];

export interface TablePaginationProps {
  /** Current active 1-indexed page */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalCount: number;
  /** Current items per page limit */
  pageSize: number;
  /** Callback when page number changes */
  onPageChange: (newPage: number) => void;
  /** Optional callback when page size limit changes */
  onPageSizeChange?: (newPageSize: number) => void;
  /** Options for the per-page selector dropdown */
  pageSizeOptions?: PageSizeOption[];
  /** Name of the entity being listed (e.g. "passengers", "bookings", "ferries") */
  itemName?: string;
  /** Whether a query or data fetch is currently in flight */
  isLoading?: boolean;
  /** Optional additional class name for the container */
  className?: string;
}

/** Standalone pagination bar. Same look as the shadcn data-table footer. */
export function TablePagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  itemName = "items",
  isLoading = false,
  className
}: TablePaginationProps) {
  return (
    <DataTablePaginationBar
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      totalPages={totalPages}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizes={pageSizeOptions.map((option) => Number(option.value))}
      itemName={itemName}
      isLoading={isLoading}
      className={className}
    />
  );
}
