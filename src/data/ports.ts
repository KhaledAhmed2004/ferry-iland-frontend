import { AVAILABLE_FERRIES } from "./ferries";
import { POPULAR_ROUTES } from "./routes";

export const CARIBBEAN_PORTS: string[] = [
  "Blowing Point, Anguilla",
  "Marigot, Saint Martin",
  "Philipsburg, Sint Maarten",
  "Fort Bay Harbor, Saba",
  "Gallows Bay, Sint Eustatius",
  "Port Zante, St. Kitts"
];

/**
 * Dynamically extract unique ports from ferries & routes datasets
 */
export function getUniquePorts(): string[] {
  const set = new Set<string>(CARIBBEAN_PORTS);

  AVAILABLE_FERRIES.forEach((f) => {
    if (f.departurePort) set.add(f.departurePort);
    if (f.arrivalPort) set.add(f.arrivalPort);
  });

  POPULAR_ROUTES.forEach((r) => {
    if (r.from) set.add(r.from);
    if (r.to) set.add(r.to);
  });

  return Array.from(set).sort();
}
