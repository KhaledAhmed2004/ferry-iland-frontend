"use client";

import * as React from "react";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";

export interface UseRowSelectionOptions<T> {
  /** Rows currently on screen — remembered so selections from earlier pages keep their data. */
  data: T[];
  getRowId: (row: T) => string;
  /**
   * Selection is cleared whenever this value changes. Pass the filters/search that
   * define the result set, so a selection never silently covers rows the user can't see.
   */
  resetKey?: string;
}

function rememberRows<T>(cache: Map<string, T>, rows: T[], getRowId: (row: T) => string) {
  if (rows.length === 0) return cache;
  const next = new Map(cache);
  for (const row of rows) next.set(getRowId(row), row);
  return next;
}

/**
 * Row selection that survives paging. Feed `rowSelection` / `onRowSelectionChange`
 * to `<DataTable>`; read `selectedRows` for bulk actions such as export.
 */
export function useRowSelection<T>({ data, getRowId, resetKey = "" }: UseRowSelectionOptions<T>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [rowCache, setRowCache] = React.useState(() => rememberRows(new Map<string, T>(), data, getRowId));

  // Adjust state during render (not in an effect) when the visible page or the filters change.
  const [prevData, setPrevData] = React.useState(data);
  if (prevData !== data && !(prevData.length === 0 && data.length === 0)) {
    setPrevData(data);
    setRowCache((cache) => rememberRows(cache, data, getRowId));
  }

  const [prevResetKey, setPrevResetKey] = React.useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setRowSelection({});
  }

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  );

  const selectedRows = React.useMemo(
    () => selectedIds.map((id) => rowCache.get(id)).filter((row): row is T => row !== undefined),
    [selectedIds, rowCache]
  );

  const onRowSelectionChange = React.useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => setRowSelection((prev) => (typeof updater === "function" ? updater(prev) : updater)),
    []
  );

  /** Add rows fetched outside the table (e.g. "select all across pages"). */
  const selectRows = React.useCallback(
    (rows: T[]) => {
      setRowCache((cache) => rememberRows(cache, rows, getRowId));
      setRowSelection((prev) => {
        const next = { ...prev };
        for (const row of rows) next[getRowId(row)] = true;
        return next;
      });
    },
    [getRowId]
  );

  const clearSelection = React.useCallback(() => setRowSelection({}), []);

  return {
    rowSelection,
    onRowSelectionChange,
    selectedIds,
    selectedRows,
    selectedCount: selectedIds.length,
    selectRows,
    clearSelection
  } as const;
}
