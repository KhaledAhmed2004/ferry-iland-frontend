export const CARIBBEAN_PORTS: string[] = [
  "Blowing Point, Anguilla",
  "Marigot, Saint Martin",
  "Philipsburg, Sint Maarten",
  "Fort Bay Harbor, Saba",
  "Gallows Bay, Sint Eustatius",
  "Port Zante, St. Kitts"
];

/**
 * Dynamically extract unique ports (Caribbean Ports network)
 */
export function getUniquePorts(): string[] {
  return [...CARIBBEAN_PORTS].sort();
}
