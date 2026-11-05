"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Compass, RotateCcw } from "lucide-react";

import { usePopularRoutesQuery } from "@/hooks";
import { AnimatedSection, Button } from "@/ui";
import { RouteCard } from "./RouteCard";

const PAGE_SIZE = 6;

const samePort = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function ExploreRoutesGrid() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: routes = [], isLoading, isError, refetch } = usePopularRoutesQuery({ limit: 100 });

  // Filter comes from the search bar above, via the URL (?from=&to=)
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const hasFilter = Boolean(from || to);

  const filteredRoutes = React.useMemo(
    () =>
      routes.filter(
        (r) => (!from || samePort(r.from, from)) && (!to || samePort(r.to, to))
      ),
    [routes, from, to]
  );

  // Show PAGE_SIZE more per click; start over whenever the filter changes
  const filterKey = `${from}|${to}`;
  const [pager, setPager] = React.useState({ key: filterKey, count: PAGE_SIZE });
  const visibleCount = pager.key === filterKey ? pager.count : PAGE_SIZE;
  const displayedRoutes = filteredRoutes.slice(0, visibleCount);
  const hasMore = filteredRoutes.length > displayedRoutes.length;

  const clearFilter = () => router.replace(pathname, { scroll: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-foreground text-2xl font-black tracking-tight sm:text-3xl">
          All routes
        </h2>
        {!isLoading && !isError && filteredRoutes.length > 0 && (
          <p className="text-muted-foreground text-xs font-medium">
            Showing {displayedRoutes.length} of {filteredRoutes.length}{" "}
            {filteredRoutes.length === 1 ? "route" : "routes"}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="border-border/80 bg-card animate-pulse overflow-hidden rounded-3xl border shadow-2xs"
            >
              <div className="bg-muted/60 h-48" />
              <div className="space-y-3 p-5">
                <div className="bg-muted/80 h-4 w-3/4 rounded" />
                <div className="bg-muted/60 h-3 w-1/2 rounded" />
                <div className="border-border/60 flex items-center justify-between border-t pt-3">
                  <div className="bg-muted h-4 w-20 rounded" />
                  <div className="bg-muted h-8 w-24 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        // Never fall back to fake routes
        <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-3xl border px-4 py-16 text-center shadow-xs">
          <h3 className="text-foreground text-base font-bold">We couldn&apos;t load routes right now</h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            Please check your connection and try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4 h-8 rounded-xl text-xs font-semibold"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-3xl border px-4 py-16 text-center shadow-xs">
          <div className="bg-muted/60 text-muted-foreground mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Compass className="h-7 w-7" />
          </div>
          <h3 className="text-foreground text-base font-bold">No ferry routes found</h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            {hasFilter
              ? "No route runs between these ports. Try a different port."
              : "There are no active ferry routes at the moment."}
          </p>
          {hasFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilter}
              className="mt-4 h-8 rounded-xl text-xs font-semibold"
            >
              Show all routes
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedRoutes.map((route, idx) => (
              <AnimatedSection key={route.id} delay={Math.min((idx % PAGE_SIZE) * 0.04, 0.25)}>
                <RouteCard route={route} />
              </AnimatedSection>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setPager({ key: filterKey, count: visibleCount + PAGE_SIZE })}
                className="rounded-xl text-sm font-semibold"
              >
                Show more routes
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
