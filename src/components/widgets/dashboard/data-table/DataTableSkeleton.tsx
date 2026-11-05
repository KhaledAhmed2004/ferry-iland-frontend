import { cn } from "@/lib/utils";
import { Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui";

/** Bar widths cycled across columns so rows don't look like one solid block. */
const CELL_WIDTHS = ["w-32", "w-24", "w-40", "w-20", "w-28", "w-16"];

export type SkeletonCellKind = "select" | "actions" | "text";

/** One placeholder cell, shaped like what the real cell will hold. */
export function SkeletonCell({ kind = "text", index = 0 }: { kind?: SkeletonCellKind; index?: number }) {
  if (kind === "select") return <Skeleton className="size-4 rounded-[4px]" />;
  if (kind === "actions") return <Skeleton className="ml-auto size-8" />;
  return <Skeleton className={cn("h-4 max-w-full", CELL_WIDTHS[index % CELL_WIDTHS.length])} />;
}

/** Skeleton rows for a table body; `kinds` gives the shape of each column. */
export function DataTableSkeletonRows({ rows = 5, kinds }: { rows?: number; kinds: SkeletonCellKind[] }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={`skeleton-${rowIdx}`} className="hover:bg-transparent">
          {kinds.map((kind, colIdx) => (
            <TableCell key={colIdx} className="h-[41px]">
              <SkeletonCell kind={kind} index={colIdx + rowIdx} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * Whole shadcn data-table placeholder (filter + Columns, table, footer) built from
 * shadcn's Skeleton. Use when the table itself can't render yet.
 */
export function DataTableSkeleton({
  rows = 5,
  columns = 5,
  withSelect = false,
  withActions = true,
  withToolbar = true,
  withFooter = true,
  className
}: {
  rows?: number;
  columns?: number;
  withSelect?: boolean;
  withActions?: boolean;
  withToolbar?: boolean;
  withFooter?: boolean;
  className?: string;
}) {
  const kinds: SkeletonCellKind[] = [
    ...(withSelect ? (["select"] as const) : []),
    ...Array.from({ length: Math.max(1, columns) }, () => "text" as const),
    ...(withActions ? (["actions"] as const) : [])
  ];

  return (
    <div className={cn("w-full", className)} role="status" aria-label="Loading table">
      {withToolbar && (
        <div className="flex items-center gap-2 py-4">
          <Skeleton className="h-8 w-full max-w-sm" />
          <Skeleton className="ml-auto h-8 w-24" />
        </div>
      )}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {kinds.map((kind, i) => (
                <TableHead key={i}>
                  {kind === "select" ? (
                    <Skeleton className="size-4 rounded-[4px]" />
                  ) : kind === "actions" ? null : (
                    <Skeleton className="h-4 w-20" />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <DataTableSkeletonRows rows={rows} kinds={kinds} />
          </TableBody>
        </Table>
      </div>
      {withFooter && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Skeleton className="mr-auto h-4 w-40" />
          <Skeleton className="h-7 w-[74px]" />
          <Skeleton className="h-7 w-[52px]" />
        </div>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
