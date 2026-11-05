"use client";

import * as React from "react";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

import { useDebounce } from "./use-debounce";

export interface TableSort {
  id: string;
  desc: boolean;
}

export interface UseTableStateOptions<F extends Record<string, string>> {
  /** Rows per page when the URL does not specify one. */
  defaultPageSize?: number;
  /** Sort applied when the URL has no `sort` param. */
  defaultSort?: TableSort;
  /** Extra string filters (e.g. `{ status: "ALL" }`) — each becomes a URL param. */
  filters?: F;
  /** Delay before the search box value is applied. */
  debounceMs?: number;
  /** Prefix for URL keys, needed only when one page renders two stateful tables. */
  prefix?: string;
}

const encodeSort = (sort: TableSort) => `${sort.id}.${sort.desc ? "desc" : "asc"}`;

const decodeSort = (raw: string): TableSort | null => {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const dir = raw.slice(dot + 1);
  if (dir !== "asc" && dir !== "desc") return null;
  return { id: raw.slice(0, dot), desc: dir === "desc" };
};

/**
 * Single source of truth for a server-driven dashboard table: search (debounced),
 * page, page size, sort and filters — all persisted in the URL so refresh and
 * shared links keep the view. Any change other than paging resets to page 1.
 */
export function useTableState<F extends Record<string, string> = Record<string, never>>(
  options: UseTableStateOptions<F> = {}
) {
  const { defaultPageSize = 10, defaultSort, debounceMs = 350, prefix = "" } = options;

  // Callers usually pass an inline object; key the parsers on its contents, not identity.
  const filtersKey = JSON.stringify(options.filters ?? {});
  const filterDefaults = React.useMemo(() => JSON.parse(filtersKey) as F, [filtersKey]);

  const parsers = React.useMemo(() => {
    const filterParsers = Object.fromEntries(
      Object.entries(filterDefaults).map(([key, def]) => [key, parseAsString.withDefault(def)])
    );
    return {
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(defaultPageSize),
      sort: parseAsString.withDefault(""),
      ...filterParsers
    };
  }, [filterDefaults, defaultPageSize]);

  const urlKeys = React.useMemo(
    () =>
      prefix
        ? Object.fromEntries(Object.keys(parsers).map((key) => [key, `${prefix}${key}`]))
        : undefined,
    [parsers, prefix]
  );

  const [state, setState] = useQueryStates(parsers, { history: "replace", scroll: false, urlKeys });
  const urlState = state as Record<string, string | number>;

  // The input updates instantly; the URL (and therefore the query) follows after the debounce.
  const urlSearch = String(urlState.q ?? "");
  const [search, setSearch] = React.useState(urlSearch);
  const debouncedSearch = useDebounce(search, debounceMs);

  React.useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      void setState({ q: debouncedSearch || null, page: null } as never);
    }
    // Only react to the user's typing, not to the URL echoing back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keep the input in sync when the URL changes from outside (back button, link).
  // Our own writes always equal `debouncedSearch`, so anything else came from outside.
  const [prevUrlSearch, setPrevUrlSearch] = React.useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    if (urlSearch !== debouncedSearch) setSearch(urlSearch);
  }

  const page = Math.max(1, Number(urlState.page) || 1);
  const pageSize = Math.max(1, Number(urlState.pageSize) || defaultPageSize);

  const activeSort = decodeSort(String(urlState.sort ?? "")) ?? defaultSort ?? null;
  const sorting = React.useMemo<SortingState>(
    () => (activeSort ? [{ id: activeSort.id, desc: activeSort.desc }] : []),
    [activeSort?.id, activeSort?.desc] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const filters = React.useMemo(
    () =>
      Object.fromEntries(
        Object.keys(filterDefaults).map((key) => [key, String(urlState[key] ?? filterDefaults[key])])
      ) as F,
    [filterDefaults, urlState]
  );

  const setPage = React.useCallback(
    (next: number) => void setState({ page: next <= 1 ? null : next } as never),
    [setState]
  );

  const setPageSize = React.useCallback(
    (next: number) => void setState({ pageSize: next, page: null } as never),
    [setState]
  );

  const setSorting = React.useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      const isDefault =
        !first || (defaultSort && first.id === defaultSort.id && first.desc === defaultSort.desc);
      void setState({ sort: isDefault ? null : encodeSort(first), page: null } as never);
    },
    [setState, sorting, defaultSort]
  );

  const setFilter = React.useCallback(
    <K extends keyof F & string>(key: K, value: F[K]) =>
      void setState({ [key]: value === filterDefaults[key] ? null : value, page: null } as never),
    [setState, filterDefaults]
  );

  const reset = React.useCallback(() => {
    setSearch("");
    void setState(Object.fromEntries(Object.keys(parsers).map((key) => [key, null])) as never);
  }, [setState, parsers]);

  return {
    /** Live input value — bind this to the search box. */
    search,
    setSearch,
    /** Debounced value that drives the query. */
    debouncedSearch: urlSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    sorting,
    setSorting,
    sortBy: activeSort?.id,
    sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : undefined,
    filters,
    setFilter,
    reset
  } as const;
}

export type TableState<F extends Record<string, string> = Record<string, never>> = ReturnType<
  typeof useTableState<F>
>;
