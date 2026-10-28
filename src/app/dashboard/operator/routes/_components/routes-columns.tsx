import { ArrowRight, Clock, Edit, Globe, Trash2 } from "lucide-react";

import { StatusBadge, type TableColumn } from "@/widgets";
import { Button, Checkbox } from "@/ui";
import type { IRoute } from "@/types";

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 mins";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${mins} mins`;
}

export interface RouteColumnsOptions {
  selectedRouteIds: Set<string>;
  isAllCurrentPageSelected: boolean;
  isSomeCurrentPageSelected: boolean;
  toggleSelectAllCurrentPage: () => void;
  toggleSelectRow: (id: string) => void;
  onEdit: (route: IRoute) => void;
  onDelete: (route: IRoute) => void;
}

export function getRouteColumns({
  selectedRouteIds,
  isAllCurrentPageSelected,
  isSomeCurrentPageSelected,
  toggleSelectAllCurrentPage,
  toggleSelectRow,
  onEdit,
  onDelete
}: RouteColumnsOptions): TableColumn<IRoute>[] {
  return [
    {
      header: (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              isAllCurrentPageSelected ? true : isSomeCurrentPageSelected ? "indeterminate" : false
            }
            onCheckedChange={toggleSelectAllCurrentPage}
            aria-label="Select all routes on current page"
          />
        </div>
      ),
      headerClassName: "w-10 px-3 text-center",
      className: "w-10 px-3 text-center",
      align: "center",
      cell: (item) => {
        const isChecked = selectedRouteIds.has(item.id);
        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleSelectRow(item.id)}
              aria-label={`Select route ${item.departurePort?.name} to ${item.destinationPort?.name}`}
            />
          </div>
        );
      }
    },
    {
      header: "ROUTE",
      cell: (item) => {
        return (
          <div className="flex items-center gap-3.5">
            <div className="border-border/80 bg-muted/40 group relative h-12 w-16 shrink-0 overflow-hidden rounded-xl border shadow-2xs sm:h-14 sm:w-20">
              {item.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.imageUrl}
                  alt={`${item.departurePort?.name ?? "Port"} to ${item.destinationPort?.name ?? "Port"}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center">
                  <Globe className="h-5 w-5 opacity-40" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
              {item.isBorderCrossing && (
                <div
                  className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 shadow-xs ring-2 ring-white dark:ring-slate-900"
                  title="International Border Crossing"
                />
              )}
            </div>
            <div className="max-w-[280px]">
              <div className="text-foreground flex items-center gap-1.5 text-xs font-bold sm:text-sm">
                <span>{item.departurePort?.name ?? "Departure"}</span>
                <ArrowRight className="text-muted-foreground h-3 w-3 shrink-0" />
                <span>{item.destinationPort?.name ?? "Arrival"}</span>
              </div>
              {item.description ? (
                <p
                  className="text-muted-foreground mt-0.5 truncate text-[11px]"
                  title={item.description}
                >
                  {item.description}
                </p>
              ) : null}
              <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[10px]">
                {item.isBorderCrossing ? (
                  <span className="py-0.2 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    <Globe className="h-2.5 w-2.5" /> International
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: "DURATION",
      cell: (item) => (
        <div className="text-foreground flex items-center gap-1.5 text-xs font-medium">
          <Clock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span>{formatDuration(item.durationMinutes)}</span>
        </div>
      )
    },
    {
      header: "STATUS",
      cell: (item) => <StatusBadge status={item.status === "ACTIVE" ? "Active" : "Inactive"} />
    },
    {
      header: "ACTIONS",
      align: "right",
      headerClassName: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onEdit(item)}
            className="h-8 w-8 rounded-lg border-emerald-200 font-semibold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            title="Edit Route Details"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDelete(item)}
            className="h-8 w-8 rounded-lg border-rose-200 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
            title="Delete Route"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];
}
