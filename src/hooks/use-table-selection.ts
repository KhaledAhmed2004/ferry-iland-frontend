import * as React from "react";

export interface UseTableSelectionOptions<T> {
  items: T[];
  idKey?: keyof T;
  allPageItems?: T[];
}

export interface UseTableSelectionReturn<T> {
  selectedIds: Set<string>;
  selectedCount: number;
  isAllCurrentPageSelected: boolean;
  isSomeCurrentPageSelected: boolean;
  isSelected: (id: string) => boolean;
  toggleRow: (id: string) => void;
  toggleSelectAllCurrentPage: () => void;
  toggleSelectAllAcrossPages: () => void;
  clearSelection: () => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedItems: T[];
}

export function useTableSelection<T extends Record<string, any>>({
  items,
  idKey = "id" as keyof T,
  allPageItems
}: UseTableSelectionOptions<T>): UseTableSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const currentIds = React.useMemo(
    () => items.map((item) => String(item[idKey])),
    [items, idKey]
  );

  const isAllCurrentPageSelected =
    items.length > 0 && currentIds.every((id) => selectedIds.has(id));

  const isSomeCurrentPageSelected =
    currentIds.some((id) => selectedIds.has(id)) && !isAllCurrentPageSelected;

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggleRow = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAllCurrentPage = React.useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllCurrentPageSelected) {
        currentIds.forEach((id) => next.delete(id));
      } else {
        currentIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [isAllCurrentPageSelected, currentIds]);

  const toggleSelectAllAcrossPages = React.useCallback(() => {
    const pool = allPageItems ?? items;
    const allIds = pool.map((item) => String(item[idKey]));
    setSelectedIds(new Set(allIds));
  }, [allPageItems, items, idKey]);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = React.useMemo(() => {
    const pool = allPageItems ?? items;
    return pool.filter((item) => selectedIds.has(String(item[idKey])));
  }, [allPageItems, items, idKey, selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    isSelected,
    toggleRow,
    toggleSelectAllCurrentPage,
    toggleSelectAllAcrossPages,
    clearSelection,
    setSelectedIds,
    selectedItems
  };
}
