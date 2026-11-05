"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input, Skeleton, Tabs, TabsList, TabsTrigger } from "@/ui";

export interface TableToolbarTab<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export type ToolbarTab<T extends string = string> = TableToolbarTab<T>;

export interface TableToolbarProps<T extends string = string> {
  /** Search input query (alias: searchValue) */
  searchTerm?: string;
  searchValue?: string;
  /** Search input onChange */
  onSearchChange: (value: string) => void;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Currently selected tab value */
  activeTab?: T;
  /** Callback fired when a tab is selected */
  onTabChange?: (tab: T) => void;
  /** Tabs to render on the right */
  tabs?: TableToolbarTab<T>[];
  /** Optional extra content or buttons placed after the tabs or search */
  children?: React.ReactNode;
  /** Optional custom container className */
  className?: string;
  /** Optional custom input className */
  inputClassName?: string;
  /** While the first load is in flight, tab counts show a skeleton instead of "0". */
  countsLoading?: boolean;
}

export function TableToolbar<T extends string = string>({
  searchTerm,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  activeTab,
  onTabChange,
  tabs,
  children,
  className,
  inputClassName,
  countsLoading = false
}: TableToolbarProps<T>) {
  const effectiveSearch = searchTerm ?? searchValue ?? "";

  // Same row as shadcn's data-table-demo: a plain filter input, then the status tabs.
  return (
    <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-2", className)}>
      <Input
        type="text"
        placeholder={searchPlaceholder}
        value={effectiveSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        className={cn("h-8 max-w-sm rounded-lg", inputClassName)}
      />

      {tabs && tabs.length > 0 && activeTab && onTabChange && (
        <Tabs
          value={activeTab}
          onValueChange={(val) => onTabChange(val as T)}
          className="w-auto max-w-full overflow-x-auto"
        >
          <TabsList className="h-8">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap">
                {tab.label}
                {countsLoading ? (
                  <Skeleton className="ml-1 h-3 w-4" />
                ) : (
                  tab.count !== undefined && (
                    <span className="text-muted-foreground ml-1">{tab.count}</span>
                  )
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {children}
    </div>
  );
}
