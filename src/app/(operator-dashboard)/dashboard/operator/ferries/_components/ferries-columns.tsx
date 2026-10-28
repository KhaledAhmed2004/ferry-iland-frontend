import * as React from "react";
import Image from "next/image";
import {
  Coffee,
  Edit,
  Luggage,
  ShieldCheck,
  Ship,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  Users,
  Waves,
  Wifi,
  Wind,
  Zap
} from "lucide-react";
import type { IFerry, VesselStatus, VesselType } from "@/types";
import { Button, Checkbox, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";
import { StatusBadge, type TableColumn } from "@/widgets";
import { getDynamicVesselImage } from "@/data/media-catalog";
import { cn } from "@/lib/utils";

export const SUGGESTED_VESSEL_AMENITIES = [
  "Air Conditioned",
  "WiFi Onboard",
  "Life Jackets Provided",
  "Luggage Assistance",
  "Scenic Sun Deck",
  "Restroom Onboard",
  "USB Charging Ports",
  "Snacks Available",
  "Comfortable Seating",
  "Safety Briefing"
];

export function getAmenityIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("air") || lower.includes("ac") || lower.includes("cool")) {
    return <Wind className="h-3 w-3 shrink-0 text-sky-600 dark:text-sky-400" />;
  }
  if (lower.includes("speed") || lower.includes("boat")) {
    return <Ship className="h-3 w-3 shrink-0 text-blue-600 dark:text-blue-400" />;
  }
  if (lower.includes("bag") || lower.includes("luggage")) {
    return <Luggage className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  }
  if (lower.includes("wifi")) {
    return <Wifi className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />;
  }
  if (lower.includes("surf")) {
    return <Waves className="h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />;
  }
  if (lower.includes("scenic") || lower.includes("deck") || lower.includes("view")) {
    return <Sun className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />;
  }
  if (lower.includes("jacket") || lower.includes("life") || lower.includes("safe")) {
    return <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  }
  if (lower.includes("snack") || lower.includes("bar") || lower.includes("drink") || lower.includes("coffee")) {
    return <Coffee className="h-3 w-3 shrink-0 text-orange-600 dark:text-orange-400" />;
  }
  if (lower.includes("usb") || lower.includes("charg") || lower.includes("power")) {
    return <Zap className="h-3 w-3 shrink-0 text-yellow-600 dark:text-yellow-400" />;
  }
  if (lower.includes("comfort") || lower.includes("seat") || lower.includes("premium")) {
    return <Sparkles className="h-3 w-3 shrink-0 text-purple-600 dark:text-purple-400" />;
  }
  return <Tag className="text-muted-foreground h-3 w-3 shrink-0" />;
}

export function getAmenityStyle(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("air") || lower.includes("ac") || lower.includes("cool")) {
    return "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/50";
  }
  if (lower.includes("speed") || lower.includes("boat")) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/50";
  }
  if (lower.includes("bag") || lower.includes("luggage")) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50";
  }
  if (lower.includes("wifi")) {
    return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/50";
  }
  if (lower.includes("surf")) {
    return "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/50";
  }
  if (lower.includes("scenic") || lower.includes("deck") || lower.includes("view")) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50";
  }
  if (lower.includes("jacket") || lower.includes("life") || lower.includes("safe")) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50";
  }
  if (lower.includes("snack") || lower.includes("bar") || lower.includes("drink") || lower.includes("coffee")) {
    return "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/50";
  }
  if (lower.includes("usb") || lower.includes("charg") || lower.includes("power")) {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300 border-yellow-200/80 dark:border-yellow-800/50";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300 border-slate-200 dark:border-slate-700/60";
}

export function getFerryAmenities(ferry: IFerry): string[] {
  if (Array.isArray(ferry.amenities) && ferry.amenities.length > 0) {
    return ferry.amenities;
  }
  return ["Air Conditioned", "Life Jackets Provided", "Luggage Assistance"];
}

export function getFerryImage(ferry: IFerry): string {
  if (
    ferry.imageUrl &&
    (ferry.imageUrl.trim().startsWith("http") || ferry.imageUrl.trim().startsWith("data:image/"))
  ) {
    return ferry.imageUrl.trim();
  }
  return getDynamicVesselImage(ferry.type, ferry.name || ferry.registration || ferry.id);
}

export function formatFerryType(type: VesselType | string): string {
  switch (type) {
    case "CATAMARAN":
      return "Catamaran";
    case "SPEEDBOAT":
      return "Speedboat";
    case "TRADITIONAL_FERRY":
      return "Traditional Ferry";
    default:
      return type;
  }
}

export function formatFerryStatus(status: VesselStatus | string): string {
  switch (status) {
    case "IN_SERVICE":
      return "In Service";
    case "MAINTENANCE":
      return "Maintenance";
    case "OUT_OF_SERVICE":
      return "Out of Service";
    default:
      return status;
  }
}

export interface GetFerryColumnsOptions {
  selectedFerryIds: Set<string>;
  isAllCurrentPageSelected: boolean;
  isSomeCurrentPageSelected: boolean;
  toggleSelectAllCurrentPage: () => void;
  toggleSelectRow: (id: string) => void;
  onEdit: (ferry: IFerry) => void;
  onDelete: (ferry: IFerry) => void;
}

export function getFerryColumns({
  selectedFerryIds,
  isAllCurrentPageSelected,
  isSomeCurrentPageSelected,
  toggleSelectAllCurrentPage,
  toggleSelectRow,
  onEdit,
  onDelete
}: GetFerryColumnsOptions): TableColumn<IFerry>[] {
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
            aria-label="Select all ferries on current page"
          />
        </div>
      ),
      headerClassName: "w-10 px-3 text-center",
      className: "w-10 px-3 text-center",
      align: "center",
      cell: (item) => {
        const isChecked = selectedFerryIds.has(item.id);
        return (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleSelectRow(item.id)}
              aria-label={`Select ferry ${item.name}`}
            />
          </div>
        );
      }
    },
    {
      header: "FERRY VESSEL",
      cell: (item) => {
        const ferryImg = getFerryImage(item);
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted shadow-2xs">
              <Image
                src={ferryImg}
                alt={item.name}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized={ferryImg.startsWith("data:")}
              />
            </div>
            <div>
              <div className="font-bold text-foreground text-sm">{item.name}</div>
              {item.createdAt ? (
                <div className="text-[11px] text-muted-foreground">
                  Added {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              ) : null}
            </div>
          </div>
        );
      }
    },
    {
      header: "REGISTRATION NO.",
      accessorKey: "registration",
      className: "font-mono font-medium text-slate-700 dark:text-slate-300 text-xs"
    },
    {
      header: "FERRY TYPE",
      cell: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
          {formatFerryType(item.type)}
        </span>
      )
    },
    {
      header: "CAPACITY",
      className: "font-semibold text-foreground text-xs",
      cell: (item) => (
        <div className="flex items-center gap-1.5 font-mono">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{item.capacity} Seats</span>
        </div>
      )
    },
    {
      header: "ONBOARD FACILITIES",
      cell: (item) => {
        const amenities = getFerryAmenities(item);
        if (amenities.length === 0) {
          return (
            <span className="text-muted-foreground text-[11px] italic">Standard transfer</span>
          );
        }

        const visible = amenities.slice(0, 2);
        const remaining = amenities.slice(2);

        return (
          <div className="flex max-w-[240px] flex-wrap items-center gap-1.5">
            {visible.map((amenity) => {
              const badgeClass = getAmenityStyle(amenity);
              return (
                <span
                  key={amenity}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shadow-2xs transition-colors",
                    badgeClass
                  )}
                  title={amenity}
                >
                  {getAmenityIcon(amenity)}
                  <span className="max-w-[105px] truncate">{amenity}</span>
                </span>
              );
            })}
            {remaining.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="bg-muted/90 text-foreground/80 hover:bg-muted border-border/80 inline-flex cursor-pointer items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold shadow-2xs transition-colors"
                  >
                    <span>+{remaining.length}</span>
                    <span className="text-muted-foreground text-[9px]">more</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-popover text-popover-foreground border-border/80 z-50 max-w-[240px] space-y-2 rounded-xl border p-2.5 shadow-xl"
                >
                  <div className="text-muted-foreground border-border/60 border-b pb-1 text-[10px] font-bold tracking-wider uppercase">
                    Onboard Facilities ({amenities.length})
                  </div>
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    {amenities.map((a) => (
                      <div
                        key={a}
                        className="text-foreground flex items-center gap-2 text-xs font-medium"
                      >
                        {getAmenityIcon(a)}
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      header: "STATUS",
      cell: (item) => <StatusBadge status={formatFerryStatus(item.status)} />
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
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold h-8 w-8 rounded-lg cursor-pointer"
            title="Edit Ferry Details"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDelete(item)}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 font-semibold h-8 w-8 rounded-lg cursor-pointer"
            title="Remove Ferry"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];
}
