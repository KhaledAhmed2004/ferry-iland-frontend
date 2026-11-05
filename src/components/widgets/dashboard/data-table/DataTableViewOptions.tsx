"use client";

// TanStack Table hands back the same table/column objects after every state change,
// so React Compiler memoization would render stale checkboxes and sort icons.
"use no memo";

import type { Column, Table } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/ui";

export function columnLabel<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header;
  return column.columnDef.meta?.label ?? (typeof header === "string" ? header : column.id);
}

/** "Columns" menu from shadcn's data-table-demo. */
export function DataTableViewOptions<TData>({ table }: { table: Table<TData> }) {
  const hideable = table.getAllColumns().filter((column) => column.getCanHide());
  if (hideable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Columns <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hideable.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            className="capitalize"
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(!!value)}
          >
            {columnLabel(column).toLowerCase()}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
