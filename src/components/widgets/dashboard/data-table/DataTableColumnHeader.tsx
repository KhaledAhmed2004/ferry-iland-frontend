"use client";

// TanStack Table hands back the same table/column objects after every state change,
// so React Compiler memoization would render stale checkboxes and sort icons.
"use no memo";

import * as React from "react";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/ui";

interface DataTableColumnHeaderProps<TData, TValue>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  column: Column<TData, TValue>;
  title: React.ReactNode;
}

/** Sortable header from shadcn's data-table-demo: a ghost button that flips asc/desc. */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>;
  }

  const align = column.columnDef.meta?.align;
  const sorted = column.getIsSorted();

  return (
    <div
      className={cn(
        align === "right" && "flex justify-end",
        align === "center" && "flex justify-center",
        className
      )}
    >
      <Button
        variant="ghost"
        className={align === "right" ? "-mr-3" : "-ml-3"}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {title}
        {sorted === "asc" ? (
          <ArrowUp />
        ) : sorted === "desc" ? (
          <ArrowDown />
        ) : (
          <ArrowUpDown className="text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
