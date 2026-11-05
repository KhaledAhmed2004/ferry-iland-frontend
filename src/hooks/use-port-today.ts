"use client";

import { useMemo, useSyncExternalStore } from "react";

import { useConnectedPortsQuery } from "@/hooks/use-routes";
import { portToday } from "@/lib/port-time";

const subscribeNoop = () => () => {};

/** True only in the browser after hydration, so "now" never differs between server and client. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

/**
 * Today's date (`YYYY-MM-DD`) at the chosen departure port, used as the search form's default
 * and earliest date (spec 0003, AC-10). Null until the port and its zone are known; callers
 * then keep the browser's today as a placeholder.
 */
export function usePortToday(departurePortName: string | null | undefined): string | null {
  const { data: connectedPorts = [] } = useConnectedPortsQuery();
  const isClient = useIsClient();

  return useMemo(() => {
    if (!isClient || !departurePortName) return null;
    const port = connectedPorts.find(
      (p) => p.portName.toLowerCase() === departurePortName.toLowerCase()
    );
    return port?.timeZone ? portToday(port.timeZone) : null;
  }, [isClient, departurePortName, connectedPorts]);
}

/** The later of two `YYYY-MM-DD` dates (string order is date order for this format). */
export const laterDate = (a: string, b: string | null): string => (b && b > a ? b : a);

/**
 * The search date to use (spec 0003, AC-10): with nothing picked, today at the departure port
 * (the browser's today only until the port's zone is known); a picked date is kept, but never
 * earlier than today at the port.
 */
export const searchDepartureDate = (
  picked: string,
  browserToday: string,
  portToday: string | null
): string => (picked ? laterDate(picked, portToday) : (portToday ?? browserToday));
