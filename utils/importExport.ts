// Import / Export helpers for the admin panel.
// Pure (de)serialization between text (CSV / JSON) and plain JS records.
// No Firebase / React imports here — Firestore writes live in the admin components.

import { CategoryI, Order, ProductT } from "@/lib/types";

/* --------------------------------- generic --------------------------------- */

/** Coerce any cell value to a number, tolerating spaces / thousands separators. */
export function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/\s/g, "").replace(/,/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Parse a boolean from CSV/JSON ("true"/"1"/"yes"/"ha"/"+" → true). */
export function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "ha" || s === "+";
}

/** Duck-typed serialization of a Firestore Timestamp / Date / seconds object to ISO. */
export function serializeTimestamp(value: unknown): string {
  try {
    if (!value) return "";
    const v = value as { toDate?: () => Date; seconds?: number };
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString();
    if (value instanceof Date) return value.toISOString();
    return String(value);
  } catch {
    return "";
  }
}

/** Trigger a browser download of a text file (client-side only). */
export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8"
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ----------------------------------- CSV ----------------------------------- */

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize a matrix of values to RFC-4180 CSV, prefixed with a UTF-8 BOM (Excel-friendly). */
export function toCSV(rows: unknown[][]): string {
  const BOM = "﻿"; // makes Excel read UTF-8 (Uzbek/Cyrillic) correctly
  const body = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  return BOM + body + "\r\n";
}

/** Parse RFC-4180 CSV (handles quotes, escaped quotes, embedded commas/newlines, CRLF, BOM). */
export function parseCSV(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += c;
        i += 1;
      }
    } else if (c === '"') {
      inQuotes = true;
      i += 1;
    } else if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
    } else if (c === "\r") {
      i += 1; // ignore; handled by the following \n
    } else {
      field += c;
      i += 1;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Build a header-indexed accessor for a CSV matrix. Accepts header aliases
 *  so files exported in older/localized formats still import cleanly. */
function rowReader(headers: string[]) {
  const lower = headers.map((h) => h.trim().toLowerCase());
  return (row: string[], names: string | string[]): string => {
    const aliases = Array.isArray(names) ? names : [names];
    for (const name of aliases) {
      const idx = lower.indexOf(name.toLowerCase());
      if (idx >= 0) return row[idx] ?? "";
    }
    return "";
  };
}

/** Friendly Yes/No for boolean columns (re-parsed by parseBool on import). */
const yesNo = (value: unknown): string => (value ? "Yes" : "No");

/** "YYYY-MM-DD HH:MM" from a Timestamp / Date / seconds object (readable + sortable). */
const formatDateTime = (value: unknown): string => {
  const iso = serializeTimestamp(value);
  return iso ? iso.replace("T", " ").slice(0, 16) : "";
};

const looksLikeJSON = (text: string, filename: string): boolean => {
  const t = text.trim();
  return filename.toLowerCase().endsWith(".json") || t.startsWith("[") || t.startsWith("{");
};

/* --------------------------------- products -------------------------------- */

export interface ImportImage {
  url: string;
  path: string;
}

/** Normalized product record produced by the parsers and consumed by the commit step. */
export interface ImportProduct {
  id: string;
  title: string;
  price: unknown;
  quantity: unknown;
  category: string;
  subCategory: string;
  description: string;
  isNew: unknown;
  isBest: unknown;
  date?: unknown;
  time?: unknown;
  storageFileId?: string;
  productImageUrl: ImportImage[];
}

// Human-first column order (business fields first, the technical key last) —
// mirrors how Shopify/WooCommerce lay out their product CSVs. Image URLs are
// intentionally omitted: images are preserved server-side on update, so the
// editable sheet stays clean.
export const PRODUCT_CSV_HEADERS = [
  "Title",
  "Price",
  "Quantity",
  "Category",
  "Subcategory",
  "Description",
  "New",
  "Best",
  "Product ID",
] as const;

const toImages = (value: unknown): ImportImage[] => {
  if (Array.isArray(value)) {
    return value
      .map((x) =>
        typeof x === "string"
          ? { url: x.trim(), path: "" }
          : { url: String((x as ImportImage)?.url ?? "").trim(), path: String((x as ImportImage)?.path ?? "") }
      )
      .filter((im) => im.url);
  }
  if (typeof value === "string") {
    return value
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url) => ({ url, path: "" }));
  }
  return [];
};

function normalizeProduct(rec: Record<string, unknown>): ImportProduct {
  const images =
    "productImageUrl" in rec && rec.productImageUrl !== undefined
      ? toImages(rec.productImageUrl)
      : toImages(rec.images);
  return {
    id: String(rec.id ?? "").trim(),
    title: String(rec.title ?? ""),
    price: rec.price,
    quantity: rec.quantity,
    category: String(rec.category ?? "").trim(),
    subCategory: String(rec.subCategory ?? rec.subcategory ?? "").trim(),
    description: String(rec.description ?? ""),
    isNew: rec.isNew,
    isBest: rec.isBest,
    date: rec.date,
    time: rec.time,
    storageFileId: rec.storageFileId ? String(rec.storageFileId) : undefined,
    productImageUrl: images,
  };
}

export function productsToCSV(products: ProductT[]): string {
  const rows: unknown[][] = [PRODUCT_CSV_HEADERS as unknown as string[]];
  for (const p of products) {
    rows.push([
      p.title ?? "",
      p.price ?? "",
      p.quantity ?? "",
      p.category ?? "",
      p.subCategory ?? "",
      p.description ?? "",
      yesNo(p.isNew),
      yesNo(p.isBest),
      p.id ?? "",
    ]);
  }
  return toCSV(rows);
}

export function parseProductsFile(text: string, filename: string): ImportProduct[] {
  if (looksLikeJSON(text, filename)) {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    return arr.map((r) => normalizeProduct(r as Record<string, unknown>));
  }
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const read = rowReader(rows[0]);
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) =>
      normalizeProduct({
        id: read(r, ["Product ID", "id"]),
        title: read(r, ["Title", "Name", "Nomi"]),
        price: read(r, ["Price", "Narxi", "Regular price", "Variant Price"]),
        quantity: read(r, ["Quantity", "Qty", "Soni", "Stock"]),
        category: read(r, ["Category", "Categories", "Kategoriya"]),
        subCategory: read(r, ["Subcategory", "Sub Category", "Subkategoriya"]),
        description: read(r, ["Description", "Tavsif", "Body"]),
        isNew: read(r, ["New", "Yangi", "isNew"]),
        isBest: read(r, ["Best", "Top", "isBest"]),
        images: read(r, ["Images", "Image Src"]),
      })
    );
}

/* -------------------------------- categories ------------------------------- */

export interface ImportCategory {
  id: string;
  name: string;
  subcategory: string[];
}

function normalizeCategory(rec: Record<string, unknown>): ImportCategory {
  let subcategory: string[] = [];
  if (Array.isArray(rec.subcategory)) {
    subcategory = rec.subcategory.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof rec.subcategory === "string") {
    subcategory = rec.subcategory
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return {
    id: String(rec.id ?? "").trim(),
    name: String(rec.name ?? "").trim(),
    subcategory,
  };
}

export function categoriesToCSV(categories: CategoryI[]): string {
  const rows: unknown[][] = [["Name", "Subcategories", "Category ID"]];
  for (const c of categories) {
    rows.push([c.name ?? "", (c.subcategory ?? []).join(" | "), c.id ?? ""]);
  }
  return toCSV(rows);
}

export function parseCategoriesFile(text: string, filename: string): ImportCategory[] {
  if (looksLikeJSON(text, filename)) {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    return arr.map((r) => normalizeCategory(r as Record<string, unknown>));
  }
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const read = rowReader(rows[0]);
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) =>
      normalizeCategory({
        id: read(r, ["Category ID", "id"]),
        name: read(r, ["Name", "Nomi"]),
        subcategory: read(r, ["Subcategories", "Subcategory", "Subkategoriya"]),
      })
    );
}

/* ---------------------------------- orders --------------------------------- */
// Orders are export-only (you don't bulk-import customer orders).

export function ordersToCSV(orders: Order[]): string {
  const rows: unknown[][] = [
    ["Date", "Customer", "Phone", "Items", "Total Quantity", "Total Price (UZS)", "Order ID"],
  ];
  for (const o of orders) {
    const items = (o.basketItems ?? [])
      .map((it) => `${it.title} x${it.quantity ?? 1}`)
      .join(" | ");
    const customer = `${o.clientName ?? ""} ${o.clientLastName ?? ""}`.trim();
    rows.push([
      formatDateTime(o.date),
      customer,
      o.clientPhone ?? "",
      items,
      o.totalQuantity ?? "",
      o.totalPrice ?? "",
      o.id ?? "",
    ]);
  }
  return toCSV(rows);
}
