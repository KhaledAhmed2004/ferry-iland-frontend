import * as React from "react";
import Link from "next/link";
import { format, isValid, parseISO } from "date-fns";
import { Edit, Ship, Trash2 } from "lucide-react";
import type { IOperatorSchedule, OperatorScheduleStatus } from "@/types";
import { Button, Checkbox } from "@/ui";
import { StatusBadge, type TableColumn } from "@/widgets";

export interface GetScheduleColumnsOptions {
  selectedScheduleIds: Set<string>;
  isAllCurrentPageSelected: boolean;
  isSomeCurrentPageSelected: boolean;
  toggleSelectAllCurrentPage: () => void;
  toggleSelectRow: (id: string) => void;
  onEdit: (schedule: IOperatorSchedule) => void;
  onDelete: (schedule: IOperatorSchedule) => void;
  onQuickStatusChange: (id: string, status: OperatorScheduleStatus) => void;
  isUpdatingStatus: boolean;
}

export function getScheduleColumns({
  selectedScheduleIds,
  isAllCurrentPageSelected,
  isSomeCurrentPageSelected,
  toggleSelectAllCurrentPage,
  toggleSelectRow,
  onEdit,
  onDelete,
  onQuickStatusChange,
  isUpdatingStatus
}: GetScheduleColumnsOptions): TableColumn<IOperatorSchedule>[] {
  return [
    {
      header: (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              isAllCurrentPageSelected
                ? true
                : isSomeCurrentPageSelected
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={toggleSelectAllCurrentPage}
            aria-label="Select all schedules on current page"
          />
        </div>
      ),
      headerClassName: "w-10 px-3 text-center",
      className: "w-10 px-3 text-center",
      align: "center",
      cell: (item) => {
        const isChecked = selectedScheduleIds.has(item.id);
        return (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleSelectRow(item.id)}
              aria-label={`Select schedule ${item.id}`}
            />
          </div>
        );
      }
    },
    {
      header: "TRIP DATE & TIME",
      cell: (item) => {
        const dep = parseISO(item.departureTime);
        const valid = isValid(dep);
        return (
          <div className="flex flex-col">
            <span className="font-mono font-bold text-foreground text-xs">
              {valid ? format(dep, "hh:mm a") : item.departureTime}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {valid ? format(dep, "dd MMM yyyy") : "—"}
            </span>
          </div>
        );
      }
    },
    {
      header: "ARRIVAL",
      cell: (item) => {
        const arr = parseISO(item.arrivalTime);
        const valid = isValid(arr);
        return (
          <div className="flex flex-col">
            <span className="font-mono font-medium text-foreground text-xs">
              {valid ? format(arr, "hh:mm a") : item.arrivalTime}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {item.route?.durationMinutes ? `${item.route.durationMinutes} mins trip` : "—"}
            </span>
          </div>
        );
      }
    },
    {
      header: "FERRY",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Ship className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-semibold text-foreground text-xs">{item.ferry?.name ?? "Ferry"}</div>
            <div className="text-[10px] text-muted-foreground">
              {item.ferry?.type ? item.ferry.type.replace("_", " ") : "Ferry"}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "ROUTE",
      cell: (item) => (
        <div>
          <div className="font-semibold text-foreground text-xs flex items-center gap-1">
            <span>{item.route?.departurePort?.name ?? "Origin"}</span>
            <span className="text-muted-foreground">→</span>
            <span>{item.route?.destinationPort?.name ?? "Destination"}</span>
          </div>
          {item.route?.durationMinutes ? (
            <div className="text-[10px] text-muted-foreground">
              {item.route.durationMinutes} mins duration
            </div>
          ) : null}
        </div>
      )
    },
    {
      header: "TICKET PRICE",
      cell: (item) => (
        <div className="text-xs">
          <div className="font-bold text-foreground font-mono">${item.adultFare}</div>
          {item.childFare != null && (
            <div className="text-[10px] text-muted-foreground font-mono">
              Child: ${item.childFare}
            </div>
          )}
        </div>
      )
    },
    {
      header: "CAPACITY",
      className: "text-xs",
      cell: (item) => {
        const capacity = item.ferry?.capacity || 0;
        const booked =
          capacity > 0 && item.availableSeats != null
            ? Math.max(0, capacity - item.availableSeats)
            : (item._count?.bookings ?? 0);
        const pct = capacity > 0 ? Math.min(Math.round((booked / capacity) * 100), 100) : 0;
        return (
          <div className="flex flex-col gap-1 min-w-[90px]">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="font-semibold text-foreground">
                {booked}/{capacity > 0 ? capacity : "—"}
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: "STATUS",
      cell: (item) => {
        const formattedStatus = item.status ? item.status.replace("_", " ") : "ON TIME";
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={formattedStatus} />
            <select
              value={item.status}
              disabled={isUpdatingStatus}
              onChange={(e) =>
                void onQuickStatusChange(item.id, e.target.value as OperatorScheduleStatus)
              }
              aria-label="Change status"
              className="text-[10px] bg-background border border-border/80 rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <option value="ON_TIME">On Time</option>
              <option value="BOARDING">Boarding</option>
              <option value="DEPARTED">Departed</option>
              <option value="DELAYED">Delayed</option>
              <option value="ARRIVED">Arrived</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        );
      }
    },
    {
      header: "ACTIONS",
      align: "right",
      headerClassName: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold text-xs h-7 px-2"
            asChild
          >
            <Link href={`/dashboard/operator/manifest?tripId=${item.id}`}>
              Manifest
            </Link>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onEdit(item)}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold h-7 w-7 rounded-lg"
            title="Edit Schedule"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onDelete(item)}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 font-semibold h-7 w-7 rounded-lg"
            title="Delete Schedule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
  ];
}
