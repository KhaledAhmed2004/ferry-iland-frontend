import type { Page } from "@playwright/test";

/**
 * Headed runs only: places each page's browser window side by side
 * (left → right, in the order given) so cross-role flows can be watched live.
 * Uses Chromium's CDP; silently does nothing elsewhere.
 */
export async function tileWindows(pages: Page[]) {
  if (pages.length === 0) return;
  const screen = await pages[0]
    .evaluate(() => ({ w: window.screen.availWidth, h: window.screen.availHeight }))
    .catch(() => null);
  if (!screen) return;

  const width = Math.floor(screen.w / pages.length);
  await Promise.all(
    pages.map(async (page, i) => {
      try {
        const cdp = await page.context().newCDPSession(page);
        const { windowId } = await cdp.send("Browser.getWindowForTarget");
        await cdp.send("Browser.setWindowBounds", {
          windowId,
          bounds: { left: i * width, top: 0, width, height: screen.h, windowState: "normal" }
        });
        await cdp.detach();
      } catch {
        // Not Chromium or window API unavailable — leave windows where they are.
      }
    })
  );
}
