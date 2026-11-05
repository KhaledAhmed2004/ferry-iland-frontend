"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Ship } from "lucide-react";

import { formatPortDate, formatPortTime, portLocalDate, portToday } from "@/lib/port-time";
import type { IPopularJourney } from "@/types";
import { Button, Card, CardContent } from "@/ui";

export const DEFAULT_ROUTE_IMAGES = [
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1505705694340-019e1e335916?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80"
];

/** A route card renders exactly what GET /routes/popular returns — no invented values. */
export type RouteCardItem = Pick<
  IPopularJourney,
  | "id"
  | "from"
  | "to"
  | "durationMinutes"
  | "nextDepartureTime"
  | "highlights"
  | "tag"
  | "description"
  | "imageUrl"
  | "departurePort"
  | "destinationPort"
>;

interface RouteCardProps {
  route: RouteCardItem;
}

/**
 * "Today, 2:30 PM" · "Tomorrow, 9:00 AM" · "Mon 10 Nov, 9:00 AM", all at the departure port,
 * so "today" is the port's today, not the viewer's (spec 0003, AC-13).
 */
function formatNextDeparture(iso: string, timeZone: string): string {
  const time = formatPortTime(iso, timeZone);
  const day = portLocalDate(iso, timeZone);
  const now = new Date();
  if (day === portToday(timeZone, now)) return `Today, ${time}`;
  if (day === portToday(timeZone, new Date(now.getTime() + 24 * 60 * 60 * 1000))) {
    return `Tomorrow, ${time}`;
  }
  return `${formatPortDate(iso, timeZone)}, ${time}`;
}

export function RouteCard({ route }: RouteCardProps) {
  const portZone = route.departurePort?.timeZone;
  const nextDepartureLabel =
    route.nextDepartureTime && portZone
      ? formatNextDeparture(route.nextDepartureTime, portZone)
      : "No trips scheduled";

  // Open the trip search on the departure port's local day of the next sailing (spec 0003).
  const searchDate =
    route.nextDepartureTime && portZone
      ? portLocalDate(route.nextDepartureTime, portZone)
      : portZone
        ? portToday(portZone)
        : new Date().toISOString().slice(0, 10);
  const fromVal = route.departurePort?.name || route.from;
  const toVal = route.destinationPort?.name || route.to;
  const targetUrl = `/ferries?from=${encodeURIComponent(fromVal)}&to=${encodeURIComponent(
    toVal
  )}&departureDate=${searchDate}&passengers=1%20Passenger&adults=1`;

  // Use the route's own image, else a stable placeholder picked from the route id
  const displayImage = React.useMemo(() => {
    const raw = route.imageUrl?.trim();
    if (raw && raw.startsWith("http")) return raw;

    const key = `${route.id}-${route.from}-${route.to}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash + key.charCodeAt(i)) % DEFAULT_ROUTE_IMAGES.length;
    }
    return DEFAULT_ROUTE_IMAGES[hash];
  }, [route.imageUrl, route.id, route.from, route.to]);

  const duration = route.durationMinutes > 0 ? `${route.durationMinutes} min` : null;
  const highlights = route.highlights ?? [];
  const tag = route.tag;

  return (
    <Card className="group border-border/80 bg-card hover:border-primary/50 overflow-hidden rounded-3xl border p-0 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between">
      <CardContent className="p-0 flex flex-col h-full justify-between">
        <div>
          {/* Top Destination Image */}
          <div className="bg-muted relative h-48 w-full overflow-hidden">
            <img
              src={displayImage}
              alt={`${route.from} to ${route.to} island ferry transfer`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_ROUTE_IMAGES[0];
              }}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />

            {/* Top Badge */}
            {tag && (
              <div className="absolute top-3 left-3 pointer-events-none">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide uppercase bg-[#003B95] text-white">
                  {tag}
                </span>
              </div>
            )}

            {/* Bottom Port Names on Image */}
            <div className="absolute bottom-3 inset-x-3 text-white pointer-events-none">
              <div className="flex items-center gap-1.5 text-xs font-extrabold drop-shadow-md min-w-0">
                <span className="truncate flex-1">{route.from}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-white/80" />
                <span className="truncate flex-1">{route.to}</span>
              </div>
            </div>
          </div>

          {/* Middle Body — only the operator's own description and amenities */}
          {(route.description || highlights.length > 0) && (
            <div className="space-y-3 p-5">
              {route.description && (
                <p className="text-muted-foreground text-xs line-clamp-2">{route.description}</p>
              )}

              {highlights.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {highlights.slice(0, 3).map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border/60"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Specs & Action Footer */}
        <div className="border-border/60 border-t p-4 pt-3 flex items-center justify-between text-xs bg-muted/10">
          <div className="flex items-center gap-3.5">
            {/* Duration */}
            {duration && (
              <div className="space-y-0.5">
                <div className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
                  Duration
                </div>
                <div className="text-foreground flex items-center gap-1 font-bold text-xs">
                  <Clock className="text-[#003B95] dark:text-blue-400 h-3 w-3" />
                  <span>{duration}</span>
                </div>
              </div>
            )}

            {/* Next bookable departure */}
            <div className="space-y-0.5">
              <div className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
                Next departure
              </div>
              <div className="text-foreground flex items-center gap-1 font-bold text-xs">
                <Ship className="text-[#003B95] dark:text-blue-400 h-3 w-3" />
                <span>{nextDepartureLabel}</span>
              </div>
            </div>
          </div>

          {/* View Trips Button */}
          <Button
            variant="outline"
            size="sm"
            className="border-border/80 text-[#003B95] dark:text-blue-400 hover:border-[#003B95] hover:bg-[#003B95]/10 h-8 rounded-xl px-3 text-[11px] font-bold shadow-2xs cursor-pointer"
            asChild
          >
            <Link href={targetUrl}>
              <span>View Trips</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
