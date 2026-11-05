type CsvCell = string | number | boolean | null | undefined;

const escapeCell = (value: CsvCell) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Builds a CSV file in the browser and triggers a download. */
export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
  // BOM so Excel opens UTF-8 names (e.g. accented operators) correctly.
  const blob = new Blob(["﻿", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** `name_2026-11-05.csv` */
export const datedCsvName = (prefix: string) => `${prefix}_${new Date().toISOString().split("T")[0]}.csv`;
