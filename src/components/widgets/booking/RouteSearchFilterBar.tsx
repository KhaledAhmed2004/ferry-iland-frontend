"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Anchor, MapPin, Search } from "lucide-react";

import { Button, Card, CardContent, Label } from "@/ui";

import { PortCombobox } from "./PortCombobox";

/**
 * Filters the routes grid on this page. The selection lives in the URL
 * (`?from=&to=`) so ExploreRoutesGrid can read it and the result is shareable.
 */
export function RouteSearchFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const hasActiveFilter = Boolean(searchParams.get("from") || searchParams.get("to"));

  const applyFilter = (nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter(from, to);
  };

  const handleClear = () => {
    setFrom("");
    setTo("");
    applyFilter("", "");
  };

  return (
    <Card className="border-border/80 bg-card/95 rounded-3xl border p-4 shadow-xl backdrop-blur-md sm:p-5">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-12">
          <div className="space-y-1.5 sm:col-span-5">
            <Label className="text-muted-foreground text-xs font-semibold">From</Label>
            <PortCombobox
              value={from}
              onChange={setFrom}
              placeholder="Any port"
              icon={MapPin}
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-5">
            <Label className="text-muted-foreground text-xs font-semibold">To</Label>
            <PortCombobox
              value={to}
              onChange={setTo}
              placeholder="Any port"
              icon={Anchor}
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="sm:col-span-2">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-2xl bg-[#003B95] text-xs font-bold text-white shadow-md transition-all hover:bg-[#002f77] hover:shadow-lg"
            >
              <Search className="mr-1.5 h-4 w-4" />
              <span>Find routes</span>
            </Button>
          </div>
        </form>

        {(hasActiveFilter || from || to) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-semibold underline-offset-4 hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
