import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type Col = { key: string; label: string; align?: "right" };
export type Cell = string | number | null;
export type Report = {
  kind: string; title: string; note: string; columns: Col[]; rows: Record<string, Cell>[];
  chart?: { kind: "bar" | "trend"; data: { name: string; value: number }[] };
};

const text = (v: Cell) => (v == null ? "" : String(v));

export function toCsv(rep: Report): string {
  const q = (v: Cell) => {
    if (typeof v === "number") return String(v);
    let t = text(v);
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; // neutralise spreadsheet formula injection in text cells
    return `"${t.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [rep.columns.map((c) => q(c.label)).join(","), ...rep.rows.map((r) => rep.columns.map((c) => q(r[c.key])).join(","))].join("\r\n");
}

/** Landscape A4 table. Standard PDF fonts only cover Latin text, so other scripts print as "?"; the CSV keeps them. */
export async function toPdf(rep: Report, meta: { institution: string; filters: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 841.89, H = 595.28, M = 36, SIZE = 8.5, ROW = 17;
  const safe = (t: string) => [...t.replace(/[\r\n\t]/g, " ")].map((ch) => { try { font.widthOfTextAtSize(ch, SIZE); return ch; } catch { return "?"; } }).join("");
  const fit = (t: string, w: number, f = font) => {
    let s = safe(t); if (f.widthOfTextAtSize(s, SIZE) <= w) return s;
    while (s.length > 1 && f.widthOfTextAtSize(s + "...", SIZE) > w) s = s.slice(0, -1);
    return s + "...";
  };
  const avail = W - 2 * M;
  const weight = rep.columns.map((c) => Math.min(30, Math.max(c.label.length, 6, ...rep.rows.slice(0, 200).map((r) => text(r[c.key]).length))));
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((w) => (avail * w) / total);

  let page = doc.addPage([W, H]), y = H - M;
  const header = () => {
    let x = M; page.drawRectangle({ x: M, y: y - 4, width: avail, height: ROW, color: rgb(0.063, 0.161, 0.294) });
    rep.columns.forEach((c, i) => { const s = fit(c.label, widths[i] - 8, bold); page.drawText(s, { x: c.align === "right" ? x + widths[i] - 4 - bold.widthOfTextAtSize(s, SIZE) : x + 4, y: y, size: SIZE, font: bold, color: rgb(1, 1, 1) }); x += widths[i]; });
    y -= ROW;
  };
  page.drawText(safe(meta.institution), { x: M, y, size: 9, font, color: rgb(0.23, 0.43, 0.7) }); y -= 20;
  page.drawText(safe(rep.title), { x: M, y, size: 16, font: bold, color: rgb(0.043, 0.122, 0.227) }); y -= 15;
  page.drawText(safe(`${rep.note}${meta.filters ? ` Filters: ${meta.filters}.` : ""} Generated ${new Date().toISOString().slice(0, 10)}.`), { x: M, y, size: 8, font, color: rgb(0.3, 0.3, 0.3) }); y -= 22;
  header();
  rep.rows.forEach((r, n) => {
    if (y < M + 24) { page = doc.addPage([W, H]); y = H - M; header(); }
    if (n % 2 === 0) page.drawRectangle({ x: M, y: y - 4, width: avail, height: ROW, color: rgb(0.949, 0.965, 0.984) });
    let x = M;
    rep.columns.forEach((c, i) => { const s = fit(text(r[c.key]), widths[i] - 8); page.drawText(s, { x: c.align === "right" ? x + widths[i] - 4 - font.widthOfTextAtSize(s, SIZE) : x + 4, y, size: SIZE, font, color: rgb(0.05, 0.1, 0.2) }); x += widths[i]; });
    y -= ROW;
  });
  if (rep.rows.length === 0) page.drawText("No data matches these filters.", { x: M, y, size: 10, font });
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Page ${i + 1} of ${pages.length}`, { x: W - M - 60, y: 18, size: 8, font, color: rgb(0.4, 0.4, 0.4) }));
  return doc.save();
}
