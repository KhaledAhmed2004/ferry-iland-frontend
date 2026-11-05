import { expect, test, type Page, type Route } from "@playwright/test";

import type { IAdminAnalyticsOverview } from "../../src/types/models";
import { authFile } from "../helpers/roles";

/**
 * UI states of the admin Overview (/dashboard/admin).
 *
 * Unlike flows/, this does not prove UI <-> backend wiring. It serves fixed analytics
 * responses (empty, negative growth, huge amounts, errors, slow load, other periods) so every
 * state is checked on every run, whatever is in the dev DB. The real backend still serves
 * everything else (auth, profile). Screenshots of each state are attached to the HTML report
 * (npm run e2e:report) for a visual review.
 *
 * Run: npx playwright test ui-states
 */

test.use({ storageState: authFile("admin") });

const ANALYTICS_URL = "**/admin/analytics/overview**";
const MOBILE = { width: 390, height: 844 };

type Overview = IAdminAnalyticsOverview;

/** A realistic 30-day overview. Each test copies it and changes only what it checks. */
function baseOverview(): Overview {
  const weeks = ["W1", "W2", "W3", "W4"];
  return {
    period: {
      key: "30d",
      label: "Last 30 Days",
      startDate: "2026-10-06T00:00:00.000Z",
      endDate: "2026-11-05T00:00:00.000Z",
      days: 30
    },
    kpis: {
      netRevenue: { value: 46.5, changePercent: 12.3, trend: "up" },
      totalBookings: { value: 9, changePercent: 12.3, trend: "up" },
      totalPassengers: { value: 9, changePercent: 12.3, trend: "up" },
      fleet: { total: 3, inService: 1, maintenance: 2, changePercent: 33.3, trend: "neutral" }
    },
    breakdowns: {
      financials: {
        grossSales: 465,
        platformCommission: 46.5,
        providerPayout: 418.5,
        changePercent: 12.3
      },
      bookings: { total: 30, confirmed: 9, checkedIn: 0, cancelled: 21, changePercent: 12.3 },
      passengers: { totalPax: 9, boardedPax: 0, changePercent: 12.3 },
      fleet: { total: 3, inService: 1, maintenance: 2 },
      providers: { total: 6, active: 6, suspended: 0 }
    },
    allTime: { grossSales: 465, totalBookings: 30, totalPax: 46 },
    charts: {
      revenueTrend: {
        revenue: weeks.map((label, i) => ({
          label,
          revenue: i === 3 ? 465 : 0,
          commission: i === 3 ? 46.5 : 0,
          payout: i === 3 ? 418.5 : 0
        })),
        bookings: weeks.map((label, i) => ({
          label,
          bookings: i === 3 ? 9 : 0,
          passengers: i === 3 ? 9 : 0
        }))
      }
    },
    recent: {
      providers: [],
      bookings: [
        {
          id: "b-1",
          reference: "FRY-20261105-TEST",
          leadPassengerName: "Aishath Niuma",
          leadPassengerEmail: "niuma.mv@islandhop.mv",
          totalAmount: 169,
          status: "CONFIRMED",
          createdAt: "2026-11-05T09:00:00.000Z",
          departureTime: "2026-11-06T09:00:00.000Z",
          route: "Philipsburg, Sint Maarten → Fort Bay Harbor, Saba",
          vessel: "Royal Alpha",
          operatorName: "Makana Ferry Service (Blues & Blues Ltd.)",
          paxCount: 2
        }
      ]
    }
  };
}

function emptyOverview(): Overview {
  const d = baseOverview();
  for (const k of ["netRevenue", "totalBookings", "totalPassengers"] as const) {
    d.kpis[k] = { value: 0, changePercent: null, trend: "neutral" };
  }
  d.kpis.fleet = { total: 0, inService: 0, maintenance: 0, changePercent: 100, trend: "neutral" };
  d.breakdowns = {
    financials: { grossSales: 0, platformCommission: 0, providerPayout: 0, changePercent: null },
    bookings: { total: 0, confirmed: 0, checkedIn: 0, cancelled: 0, changePercent: null },
    passengers: { totalPax: 0, boardedPax: 0, changePercent: null },
    fleet: { total: 0, inService: 0, maintenance: 0 },
    providers: { total: 0, active: 0, suspended: 0 }
  };
  d.charts.revenueTrend = { revenue: [], bookings: [] };
  d.recent = { providers: [], bookings: [] };
  return d;
}

function setGrowth(d: Overview, value: number | null) {
  for (const k of ["netRevenue", "totalBookings", "totalPassengers"] as const) {
    d.kpis[k].changePercent = value;
  }
  d.breakdowns.financials.changePercent = value;
  d.breakdowns.bookings.changePercent = value;
  d.breakdowns.passengers.changePercent = value;
  return d;
}

const envelope = (data: Overview) => ({
  success: true,
  statusCode: 200,
  message: "Admin analytics fetched successfully",
  data
});

/** Serves `data` for every analytics request on this page. */
async function serveOverview(page: Page, data: Overview) {
  await page.route(ANALYTICS_URL, (route) => route.fulfill({ json: envelope(data) }));
}

async function openOverview(page: Page) {
  await page.goto("/dashboard/admin");
  await expect(page.getByText("ACTIVE OPERATORS", { exact: true })).toBeVisible();
}

/** The page must never be wider than the screen (wide tables scroll inside their card). */
async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "page is wider than the viewport").toBeLessThanOrEqual(0);
}

async function attachScreenshot(page: Page, name: string) {
  await test.info().attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
}

test.describe("admin overview UI states", () => {
  test("real growth shows a signed chip compared with a named period", async ({ page }) => {
    await serveOverview(page, baseOverview());
    await openOverview(page);

    // 3 KPI cards + the Revenue Analytics badge.
    await expect(page.getByText("+12.3%", { exact: true })).toHaveCount(4);
    await expect(page.getByText("vs the 30 days before", { exact: true })).toHaveCount(3);
    // The headline counts are sold bookings, labelled as such.
    await expect(page.getByText("CONFIRMED BOOKINGS", { exact: true })).toBeVisible();
    await expect(page.getByText("PLATFORM EARNINGS", { exact: true })).toBeVisible();
    // Fleet is a snapshot: operators + ferries, never a growth figure.
    await expect(page.getByText("3 ferries on the platform", { exact: true })).toBeVisible();
    await expect(page.getByText("+33.3%")).toHaveCount(0);
    await attachScreenshot(page, "growth");
  });

  test("no earlier data says so in words, never a made up +100%", async ({ page }) => {
    await serveOverview(page, setGrowth(baseOverview(), null));
    await openOverview(page);

    // Names what was missing and when, so it never reads as "nothing this period".
    await expect(page.getByText("No earnings in the 30 days before", { exact: true })).toBeVisible();
    await expect(page.getByText("No bookings in the 30 days before", { exact: true })).toBeVisible();
    await expect(page.getByText("No passengers in the 30 days before", { exact: true })).toBeVisible();
    await expect(page.getByText(/previous 30 days/)).toHaveCount(0);
    await expect(page.getByText("+100%")).toHaveCount(0);
    // No signed growth chip anywhere: KPI cards and the Revenue Analytics badge are all hidden.
    // (The unsigned 10% / 90% fee-share chips are not growth and stay.)
    await expect(page.getByText(/^[+-]\d+(\.\d+)?%$/)).toHaveCount(0);
    await attachScreenshot(page, "no-earlier-data");
  });

  test("negative and flat growth", async ({ page }) => {
    await serveOverview(page, setGrowth(baseOverview(), -42.5));
    await openOverview(page);
    await expect(page.getByText("-42.5%", { exact: true })).toHaveCount(4);
    await attachScreenshot(page, "negative");

    await page.unroute(ANALYTICS_URL);
    await serveOverview(page, setGrowth(baseOverview(), 0));
    await page.reload();
    await expect(page.getByText("ACTIVE OPERATORS", { exact: true })).toBeVisible();
    await expect(page.getByText("0.0%", { exact: true })).toHaveCount(3);
    await attachScreenshot(page, "flat");
  });

  test("empty platform on desktop and mobile", async ({ page }) => {
    await serveOverview(page, emptyOverview());

    for (const viewport of [{ width: 1440, height: 900 }, MOBILE]) {
      await test.step(`${viewport.width}px`, async () => {
        await page.setViewportSize(viewport);
        await openOverview(page);

        await expect(page.getByText("$0.00", { exact: true }).first()).toBeVisible();
        await expect(page.getByText(/^No (earnings|bookings|passengers) in the 30 days before$/)).toHaveCount(3);
        await expect(page.getByText("0 ferries on the platform", { exact: true })).toBeVisible();
        // Every chart card shows its empty state (at least Revenue Analytics + Bookings Volume;
        // the count is not pinned so adding a chart doesn't break this test).
        const chartEmpty = page.getByText("No data for this period yet.");
        await expect(chartEmpty.first()).toBeVisible();
        expect(await chartEmpty.count()).toBeGreaterThanOrEqual(2);
        await expect(page.getByText("No recent bookings found.")).toBeVisible();
        await expectNoSidewaysScroll(page);
        await attachScreenshot(page, `empty-${viewport.width}`);
      });
    }
  });

  test("huge amounts are grouped with commas and fit a phone screen", async ({ page }) => {
    const d = setGrowth(baseOverview(), 1234.5);
    d.kpis.netRevenue.value = 1234567.89;
    d.kpis.totalBookings.value = 1234567;
    d.kpis.totalPassengers.value = 9876543;
    d.breakdowns.financials = {
      grossSales: 12345678.9,
      platformCommission: 1234567.89,
      providerPayout: 11111111.01,
      changePercent: 1234.5
    };
    d.breakdowns.providers.active = 1;
    d.breakdowns.fleet.total = 1;
    await serveOverview(page, d);
    await page.setViewportSize(MOBILE);
    await openOverview(page);

    // KPI card + Platform Fee tile.
    await expect(page.getByText("$1,234,567.89", { exact: true })).toHaveCount(2);
    await expect(page.getByText("$12,345,678.90", { exact: true })).toBeVisible();
    await expect(page.getByText("1,234,567", { exact: true })).toBeVisible();
    await expect(page.getByText("1 ferry on the platform", { exact: true })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await attachScreenshot(page, "huge-mobile");
  });

  test("comparison wording follows the selected period", async ({ page }) => {
    const cases = [
      { key: "7d", label: "Last 7 Days", days: 7, phrase: "No bookings in the 7 days before" },
      { key: "month", label: "Last Month (Oct 2026)", days: 31, phrase: "No bookings in the month before" }
    ];
    for (const c of cases) {
      await test.step(c.key, async () => {
        const d = setGrowth(baseOverview(), null);
        d.period = { ...d.period, key: c.key, label: c.label, days: c.days };
        await page.unroute(ANALYTICS_URL);
        await serveOverview(page, d);
        await openOverview(page);
        await expect(page.getByText(c.phrase, { exact: true })).toBeVisible();
      });
    }
  });

  test("server error shows a retry that recovers", async ({ page }) => {
    let fail = true;
    await page.route(ANALYTICS_URL, (route: Route) =>
      fail
        ? route.fulfill({
            status: 500,
            json: { success: false, statusCode: 500, message: "Something went wrong" }
          })
        : route.fulfill({ json: envelope(baseOverview()) })
    );
    await page.setViewportSize(MOBILE);
    await page.goto("/dashboard/admin");

    await expect(page.getByRole("heading", { name: "Failed to Load Dashboard Metrics" })).toBeVisible({
      timeout: 30_000 // React Query retries before it gives up
    });
    await expectNoSidewaysScroll(page);
    await attachScreenshot(page, "error");

    fail = false;
    await page.getByRole("button", { name: "Try Again" }).click();
    await expect(page.getByText("ACTIVE OPERATORS", { exact: true })).toBeVisible();
  });

  test("slow response shows skeletons, then the data", async ({ page }) => {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route(ANALYTICS_URL, async (route) => {
      await released;
      await route.fulfill({ json: envelope(baseOverview()) });
    });
    await page.goto("/dashboard/admin");

    // CSS on purpose: skeleton blocks have no role or text; animate-pulse is what marks them.
    await expect(page.locator("main .animate-pulse").first()).toBeVisible();
    await expect(page.getByText("ACTIVE OPERATORS", { exact: true })).toHaveCount(0);
    await attachScreenshot(page, "loading");

    release();
    await expect(page.getByText("ACTIVE OPERATORS", { exact: true })).toBeVisible();
  });
});
