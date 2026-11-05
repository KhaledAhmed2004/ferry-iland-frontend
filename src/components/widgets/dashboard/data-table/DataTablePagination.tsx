"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/ui";

export interface DataTablePaginationBarProps {
  /** 1-indexed current page. */
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Kept for API compatibility; the shadcn demo footer has no page-size picker. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizes?: number[];
  /** Show "n of total row(s) selected." instead of the row range. */
  showSelection?: boolean;
  selectedCount?: number;
  itemName?: string;
  isLoading?: boolean;
  className?: string;
}

/** Footer from shadcn's data-table-demo, driven by server-side paging. */
export function DataTablePaginationBar({
  page,
  pageSize,
  totalCount,
  totalPages: rawTotalPages,
  onPageChange,
  showSelection = false,
  selectedCount = 0,
  itemName = "items",
  isLoading = false,
  className
}: DataTablePaginationBarProps) {
  if (totalCount <= 0) return null;

  const totalPages = Math.max(1, rawTotalPages || Math.ceil(totalCount / Math.max(1, pageSize)));
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, totalCount);

  return (
    <div className={cn("flex items-center justify-end space-x-2 py-4", className)}>
      <div className="text-muted-foreground flex-1 text-sm">
        {showSelection
          ? `${selectedCount} of ${totalCount} row(s) selected.`
          : `${start}–${end} of ${totalCount} ${itemName}.`}
      </div>
      <div className="space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1 || isLoading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= totalPages || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
