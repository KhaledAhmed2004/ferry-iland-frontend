"use client";

import { format } from "date-fns";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";

import type { IDigitalPassResponse } from "@/types";

/**
 * Boarding QR contract, shared by the passes the customer holds and the operator gate scanner.
 * - Ticket QR: `PASS:<ticketNumber>:<bookingReference>` (built by the backend, ticket.service.ts)
 * - Booking QR: `BOOKING:<bookingReference>` (boards the whole party)
 * Plain ticket numbers / references typed by hand, and older `https://.../tickets/<x>` QRs, still parse.
 */
export const bookingQrPayload = (reference: string) => `BOOKING:${reference}`;

/** Ticket boarding status in customer words ("PENDING" there means not boarded yet, not unpaid). */
export const boardingStatusLabel = (status?: string | null) =>
  status === "BOARDED" ? "Boarded" : status === "CHECKED_IN" ? "Checked in" : "Ready to board";

export type BoardingScan =
  | { kind: "ticket"; ticketNumber: string; reference?: string }
  | { kind: "booking"; reference: string }
  | { kind: "any"; value: string };

export function parseBoardingScan(raw: string): BoardingScan {
  const value = raw.trim();
  const pass = /^PASS:([^:]+)(?::(.+))?$/i.exec(value);
  if (pass) return { kind: "ticket", ticketNumber: pass[1].trim(), reference: pass[2]?.trim() };
  const booking = /^BOOKING:(.+)$/i.exec(value);
  if (booking) return { kind: "booking", reference: booking[1].trim() };
  const url = /\/tickets\/([^/?#\s]+)/i.exec(value);
  if (url) return { kind: "any", value: decodeURIComponent(url[1]) };
  return { kind: "any", value };
}

// ---------- PNG download ----------

const NAVY = "#002244";
const BLUE = "#003B95";
const MUTED = "#64748B";
const TEXT = "#0F172A";
const LINE = "#E2E8F0";

/** Renders the QR as SVG off-screen and loads it as an image the canvas can draw. */
async function qrImage(value: string, size: number): Promise<HTMLImageElement> {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => root.render(<QRCodeSVG value={value} size={size} level="H" marginSize={0} />));
  let svg = host.innerHTML;
  root.unmount();
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shrinks the font until the text fits, then ellipsizes as a last resort. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight = 800,
  minSize = 14
) {
  let s = size;
  ctx.font = `${weight} ${s}px system-ui, -apple-system, Segoe UI, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && s > minSize) {
    s -= 1;
    ctx.font = `${weight} ${s}px system-ui, -apple-system, Segoe UI, sans-serif`;
  }
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 1) out = out.slice(0, -2) + "…";
  return out;
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = "left") {
  ctx.textAlign = align;
  ctx.fillStyle = MUTED;
  ctx.font = "700 12px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(text.toUpperCase(), x, y);
}

function value(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align: CanvasTextAlign = "left",
  size = 17,
  color = TEXT
) {
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(fitText(ctx, text, maxWidth, size, 700, 11), x, y);
}

function dashed(ctx: CanvasRenderingContext2D, y: number, width: number) {
  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(24, y);
  ctx.lineTo(width - 24, y);
  ctx.stroke();
  ctx.restore();
}

const fmt = (iso: string | undefined | null, pattern: string, fallback: string) =>
  iso ? format(new Date(iso), pattern) : fallback;

async function renderPass(pass: IDigitalPassResponse): Promise<Blob> {
  const W = 600;
  const hasReturn = !!pass.returnSchedule;
  const H = hasReturn ? 1010 : 950;
  const SCALE = 2;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  // Card
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, 270);
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 15px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("ISLANDHOP · BOARDING PASS", 32, 46);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "600 13px ui-monospace, Consolas, monospace";
  ctx.fillText(`Ref: ${pass.bookingReference}`, W - 32, 46);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(110,231,183,1)";
  ctx.font = "800 12px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(boardingStatusLabel(pass.boardingStatus).toUpperCase(), 32, 74);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "700 12px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("ORIGIN", 32, 120);
  ctx.textAlign = "right";
  ctx.fillText("DESTINATION", W - 32, 120);

  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.fillText(fitText(ctx, pass.trip.departurePort, 240, 30), 32, 156);
  ctx.textAlign = "right";
  ctx.fillText(fitText(ctx, pass.trip.destinationPort, 240, 30), W - 32, 156);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(32, 190, W - 64, 1);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 15px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(fmt(pass.trip.departureTime, "EEE, d MMM yyyy", "Scheduled"), 32, 226);
  ctx.textAlign = "right";
  ctx.font = "800 15px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(
    `${fmt(pass.trip.departureTime, "h:mm a", "TBD")} → ${fmt(pass.trip.arrivalTime, "h:mm a", "TBD")}`,
    W - 32,
    226
  );

  // Details
  let y = 316;
  label(ctx, "Passenger", 32, y);
  label(ctx, "Ticket number", W - 32, y, "right");
  value(ctx, pass.passengerName, 32, y + 26, 300);
  value(ctx, pass.ticketNumber, W - 32, y + 26, 230, "right", 16, BLUE);
  value(ctx, `${pass.nationality} • ${pass.passportOrId}`, 32, y + 48, 300, "left", 13, MUTED);
  value(ctx, `${pass.cabinClass} • ${pass.luggageCount} bag`, W - 32, y + 48, 230, "right", 13, MUTED);

  y += 84;
  ctx.fillStyle = LINE;
  ctx.fillRect(32, y, W - 64, 1);
  y += 30;
  label(ctx, "Ferry operator", 32, y);
  label(ctx, "Ferry & gate", W - 32, y, "right");
  value(ctx, pass.trip.operatorName, 32, y + 26, 300, "left", 15);
  value(ctx, pass.trip.vesselName, W - 32, y + 26, 230, "right", 15);
  value(ctx, `Gate: ${pass.trip.gate || "Pier 1"}`, W - 32, y + 48, 230, "right", 13, MUTED);

  if (hasReturn && pass.returnSchedule) {
    const r = pass.returnSchedule;
    y += 78;
    label(ctx, "Return trip (same ticket)", 32, y);
    value(
      ctx,
      `${r.route?.departurePort?.name ?? ""} → ${r.route?.destinationPort?.name ?? ""} · ${fmt(r.departureTime, "EEE, d MMM, h:mm a", "TBD")}`,
      32,
      y + 26,
      W - 64,
      "left",
      14
    );
  }

  // QR
  const qrTop = H - 380;
  dashed(ctx, qrTop - 24, W);
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = "600 13px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Scan at the gate or hand to crew", W / 2, qrTop + 4);

  const QR = 240;
  const img = await qrImage(pass.qrCodePayload, QR);
  ctx.drawImage(img, (W - QR) / 2, qrTop + 22, QR, QR);

  ctx.fillStyle = TEXT;
  ctx.font = "900 16px ui-monospace, Consolas, monospace";
  ctx.fillText(pass.ticketNumber, W / 2, qrTop + QR + 54);
  ctx.fillStyle = "#059669";
  ctx.font = "600 13px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(
    `Valid for departure on ${fmt(pass.trip.departureTime, "EEE, d MMM yyyy", "the scheduled date")} · Carry photo ID`,
    W / 2,
    qrTop + QR + 80
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png")
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads each pass as `boarding-pass-<ticketNumber>.png`. */
export async function downloadBoardingPasses(passes: IDigitalPassResponse[]) {
  for (const [i, pass] of passes.entries()) {
    const blob = await renderPass(pass);
    saveBlob(blob, `boarding-pass-${pass.ticketNumber}.png`);
    // Browsers drop back-to-back downloads fired in the same tick.
    if (i < passes.length - 1) await new Promise((r) => setTimeout(r, 400));
  }
}
