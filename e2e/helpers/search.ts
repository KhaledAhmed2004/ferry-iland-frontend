import { expect, type Locator, type Page } from "@playwright/test";

/** The field wrapper (innermost div) that holds a given uppercase label, e.g. "FROM". */
function field(page: Page, label: string): Locator {
  return page
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .last();
}

/** Picks a port in a PortCombobox (type to filter, then click the option). */
async function pickPort(page: Page, label: "FROM" | "TO", portName: string) {
  await field(page, label).getByRole("combobox").click();
  await page.getByPlaceholder("Search island / port...").fill(portName);
  await page.getByRole("option", { name: portName, exact: true }).click();
  // Wait for the dropdown to fully close (its close animation can overlap the next one opening).
  await expect(page.getByPlaceholder("Search island / port...")).toHaveCount(0);
  await expect(field(page, label).getByRole("combobox")).toContainText(portName);
}

/** Picks a YYYY-MM-DD date in the custom DatePicker (moves months forward as needed). */
async function pickDate(page: Page, label: string, isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const monthTitle = target.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  await field(page, label).getByRole("button").first().click();
  const calendar = page.getByRole("dialog");

  for (let i = 0; i < 12 && !(await calendar.getByText(monthTitle).isVisible()); i++) {
    await calendar.getByRole("button", { name: "Next month" }).click();
  }
  await expect(calendar.getByText(monthTitle)).toBeVisible();

  // Skip greyed-out days that belong to the previous/next month.
  await calendar
    .locator('button:not([class*="muted-foreground/40"])')
    .filter({ hasText: new RegExp(`^${d}$`) })
    .click();
}

/** Fills the landing-page hero search (one-way) and clicks "Search Ferries". */
export async function searchFromLanding(
  page: Page,
  trip: { fromPort: string; toPort: string; departureDate: string }
) {
  await pickPort(page, "FROM", trip.fromPort);
  await pickPort(page, "TO", trip.toPort);
  await pickDate(page, "DEPARTURE DATE", trip.departureDate);
  await page.getByRole("link", { name: /search ferries/i }).click();
}
