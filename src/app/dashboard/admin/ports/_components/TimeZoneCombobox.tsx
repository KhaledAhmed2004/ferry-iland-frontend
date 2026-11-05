"use client";

import * as React from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";

import { cn } from "@/lib/utils";
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

/** The zones the current ports use, kept even if a browser's own list leaves an alias out. */
const PORT_ZONES = [
  "America/Anguilla",
  "America/Marigot",
  "America/Lower_Princes",
  "America/Kralendijk",
  "America/St_Kitts",
  "America/Puerto_Rico"
];

function allTimeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return Array.from(new Set([...PORT_ZONES, ...supported])).sort();
}

interface TimeZoneComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Searchable IANA time zone picker for a port (spec 0003, AC-1). The backend validates the
 * name again, so this list only needs to be convenient, not authoritative.
 */
export function TimeZoneCombobox({ id, value, onChange, className }: TimeZoneComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const zones = React.useMemo(() => allTimeZones(), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls="time-zone-list"
          className={cn(
            "border-input bg-muted/40 text-foreground hover:bg-muted/60 flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-xs transition-colors cursor-pointer",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || "Select time zone"}
            </span>
          </span>
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search e.g. Anguilla, Puerto_Rico..." />
          <CommandList id="time-zone-list" className="max-h-64">
            <CommandEmpty>No time zone found.</CommandEmpty>
            <CommandGroup>
              {zones.map((zone) => (
                <CommandItem
                  key={zone}
                  value={zone}
                  onSelect={() => {
                    onChange(zone);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="truncate">{zone}</span>
                  {value === zone && <Check className="text-primary h-3.5 w-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
