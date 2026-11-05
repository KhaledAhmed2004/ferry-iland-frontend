"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

import { usePopularRoutesQuery } from "@/hooks";
import { Button } from "@/ui";
import { RouteCard } from "@/components/widgets/booking/RouteCard";

export function PopularJourneysSection() {
  const { data: journeys = [], isLoading, isError, refetch } = usePopularRoutesQuery({ limit: 4 });

  // Nothing real to show (no active routes) — hide the section instead of showing placeholders.
  if (!isLoading && !isError && journeys.length === 0) return null;

  return (
    <section id="schedules" className="pt-16 pb-6 md:pt-20 md:pb-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-bold tracking-wider text-blue-600 uppercase shadow-xs dark:text-blue-400">
              <Compass className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>POPULAR JOURNEYS</span>
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Explore our neighboring islands
            </h2>
            <p className="mt-4 text-xs text-muted-foreground sm:text-sm md:text-base leading-relaxed">
              Discover frequently travelled routes, guaranteed daily departures, and transparent fixed fares with no hidden booking fees.
            </p>
          </div>

          {/* View All Routes Button */}
          <div>
            <Button
              variant="outline"
              asChild
              className="h-10 rounded-xl border-blue-500/30 text-xs sm:text-sm font-bold text-blue-600 shadow-2xs hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              <Link href="/routes" className="group inline-flex items-center gap-2">
                <span>View all routes</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        {isError && (
          <div className="rounded-3xl border border-border/80 bg-card px-4 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">We couldn&apos;t load routes right now.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 rounded-xl text-xs">
              Try again
            </Button>
          </div>
        )}

        {/* Cards Grid using RouteCard from /routes */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xs animate-pulse flex flex-col justify-between"
                >
                  <div className="h-48 bg-muted/60" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted/80 rounded w-3/4" />
                    <div className="h-3 bg-muted/60 rounded w-1/2" />
                    <div className="pt-3 border-t border-border/60 flex justify-between items-center">
                      <div className="h-4 bg-muted rounded w-20" />
                      <div className="h-8 bg-muted rounded-xl w-24" />
                    </div>
                  </div>
                </div>
              ))
            : journeys.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
        </div>
      </div>
    </section>
  );
}
