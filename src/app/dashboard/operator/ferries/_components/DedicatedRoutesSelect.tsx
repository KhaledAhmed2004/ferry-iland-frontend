import * as React from "react";
import { Check, ChevronDown, Loader2, Route as RouteIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useRoutesQuery } from "@/hooks/use-routes";
import type { IFerryDedicatedRoute } from "@/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/ui";

interface RouteChoice {
  id: string;
  label: string;
  /** Only set for a saved route that is no longer open (admin closed it). */
  inactive?: boolean;
}

export interface DedicatedRoutesSelectProps {
  value: string[];
  onChange: (routeIds: string[]) => void;
  /** The ferry's saved routes, so a route the admin has since closed still shows by name. */
  savedRoutes?: IFerryDedicatedRoute[];
}

const routeLabel = (from?: string, to?: string) => `${from ?? "Origin"} → ${to ?? "Destination"}`;

/** Optional multi-select. No routes picked = the ferry may sail any route. */
export function DedicatedRoutesSelect({ value, onChange, savedRoutes = [] }: DedicatedRoutesSelectProps) {
  const [open, setOpen] = React.useState(false);
  // Operators only get ACTIVE routes from this endpoint.
  const { data, isLoading } = useRoutesQuery({ limit: 100 });

  const choices = React.useMemo<RouteChoice[]>(() => {
    const activeRoutes = (data?.routes ?? []).map((r) => ({
      id: r.id,
      label: routeLabel(r.departurePort?.name, r.destinationPort?.name)
    }));
    const openIds = new Set(activeRoutes.map((r) => r.id));
    const closed = savedRoutes
      .filter((r) => !openIds.has(r.id))
      .map((r) => ({
        id: r.id,
        label: routeLabel(r.departurePort?.name, r.destinationPort?.name),
        inactive: true
      }));
    return [...activeRoutes, ...closed].sort((a, b) => a.label.localeCompare(b.label));
  }, [data?.routes, savedRoutes]);

  const byId = React.useMemo(() => new Map(choices.map((c) => [c.id, c])), [choices]);
  const selected = value.map((id) => byId.get(id) ?? { id, label: "Unknown route" });

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      {/* modal: the list is portaled outside the ferry dialog, whose scroll lock would
          otherwise swallow mouse-wheel scrolling in it. */}
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls="dedicated-routes-list"
            className="border-input bg-background hover:bg-muted/40 flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 text-sm shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            <span className="flex min-w-0 items-center gap-2">
              {isLoading ? (
                <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <RouteIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              )}
              <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
                {value.length === 0
                  ? "Any route (no restriction)"
                  : `${value.length} ${value.length === 1 ? "route" : "routes"} selected`}
              </span>
            </span>
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[320px] p-0 shadow-xl" align="start">
          <Command>
            <CommandInput placeholder="Search routes..." />
            <CommandList id="dedicated-routes-list" className="max-h-64">
              <CommandEmpty>{isLoading ? "Loading routes..." : "No route found."}</CommandEmpty>
              <CommandGroup>
                {choices.map((route) => {
                  const isOn = value.includes(route.id);
                  return (
                    <CommandItem
                      key={route.id}
                      value={`${route.label} ${route.id}`}
                      onSelect={() => toggle(route.id)}
                      className="flex cursor-pointer items-center gap-2 py-2"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isOn ? "border-emerald-600 bg-emerald-600 text-white" : "border-input"
                        )}
                      >
                        {isOn && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <span className="truncate text-xs font-medium">{route.label}</span>
                      {route.inactive && (
                        <span className="text-muted-foreground ml-auto text-[10px]">closed</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((route) => (
            <span
              key={route.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300"
            >
              {route.label}
              <button
                type="button"
                onClick={() => toggle(route.id)}
                className="cursor-pointer rounded-full p-0.5 hover:bg-emerald-500/25"
                title={`Remove ${route.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-muted-foreground hover:text-foreground cursor-pointer px-1 text-[11px] underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
