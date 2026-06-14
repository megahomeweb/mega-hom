// Import / Export helpers for the admin panel.
// Pure (de)serialization between text (CSV / JSON) and plain JS records.
// No Firebase / React imports here — Firestore writes live in the admin components.
//
// Import philosophy (modeled on Shopify / WooCommerce / MoySklad):
//  - only the name is required, and only when creating a new record;
//  - a blank cell or a missing column NEVER overwrites existing data;
//  - bad rows are skipped one by one — one mistake never blocks the whole file.

import { CategoryI, CustomerT, Order, ProductT } from "@/lib/types";
import { normalizePhone } from "./phone";
import { orderStatusMeta } from "@/lib/orderStatus";

/* --------------------------------- generic --------------------------------- */

/** Coerce any cell value to a number, tolerating spaces / thousands separators. */
export function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/\s/g, "").replace(/,/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Parse a boolean from CSV/JSON ("true"/"1"/"yes"/"ha"/"da"/"да"/"+" → true). */
export function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "ha" || s === "da" || s === "да" || s === "+";
}

/** Blank-aware readers: undefined means "the file did not provide this value",
 *  which the import layer treats as "leave the current value unchanged". */
const optStr = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
};
const optNum = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  return optStr(value) === undefined ? undefined : num(value);
};
const optBool = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  return optStr(value) === undefined ? undefined : parseBool(value);
};

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

/** Excel saved in a Russian/Uzbek locale writes CSV with ';' (sometimes tabs).
 *  Pick the separator that appears most in the header line, outside quotes. */
function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (c === "\n") break;
      if (c in counts) counts[c]++;
    }
  }
  return counts[";"] > counts[","] && counts[";"] >= counts["\t"]
    ? ";"
    : counts["\t"] > counts[","]
      ? "\t"
      : ",";
}

/** Parse RFC-4180-style CSV (quotes, escaped quotes, embedded separators/newlines,
 *  CRLF, BOM) with auto-detected `,` / `;` / tab delimiter. */
export function parseCSV(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const delimiter = detectDelimiter(text);

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
    } else if (c === delimiter) {
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
 *  (English / Uzbek / Russian) so files from Excel, old exports or other
 *  platforms still import cleanly. */
function rowReader(headers: string[]) {
  const lower = headers.map((h) => h.trim().toLowerCase());
  return (row: string[], names: string | string[]): string | undefined => {
    const aliases = Array.isArray(names) ? names : [names];
    for (const name of aliases) {
      const idx = lower.indexOf(name.toLowerCase());
      if (idx >= 0) return row[idx] ?? "";
    }
    return undefined; // column not present in this file at all
  };
}

/** Friendly Yes/No for boolean columns (re-parsed by parseBool on import). */
const yesNo = (value: unknown): string => (value ? "Yes" : "No");

/** "YYYY-MM-DD HH:MM" from a Timestamp / Date / seconds object (readable + sortable). */
const formatDateTime = (value: unknown): string => {
  const iso = serializeTimestamp(value);
  return iso ? iso.replace("T", " ").slice(0, 16) : "";
};

/** Parse JSON backups; returns null when the text is really CSV so the caller
 *  can fall through instead of failing the whole file. */
function tryParseJSONRecords(text: string, filename: string): Record<string, unknown>[] | null {
  const t = text.trim();
  const looksLike = filename.toLowerCase().endsWith(".json") || t.startsWith("[") || t.startsWith("{");
  if (!looksLike) return null;
  try {
    const data = JSON.parse(t);
    const arr = Array.isArray(data) ? data : [data];
    return arr as Record<string, unknown>[];
  } catch {
    if (filename.toLowerCase().endsWith(".json")) throw new Error("Invalid JSON");
    return null; // e.g. a CSV whose first cell starts with "[" — treat as CSV
  }
}

/* ------------------------- shared import structures ------------------------ */

export interface ColumnOption {
  key: string;
  label: string;
  count: number;
}

export interface ImportPlan {
  create: number;
  update: number;
  skip: number;
}

/* --------------------------------- products -------------------------------- */

export interface ImportImage {
  url: string;
  path: string;
}

/** Normalized product record produced by the parsers and consumed by the commit
 *  step. `undefined` = the file did not provide the value (blank cell or no
 *  column) → on update the current value is kept, on create a default is used. */
export interface ImportProduct {
  id: string;
  title?: string;
  price?: number;
  costPrice?: number;
  quantity?: number;
  category?: string;
  subCategory?: string;
  description?: string;
  isNew?: boolean;
  isBest?: boolean;
  ikpu?: string;
  vatRate?: number;
  barcode?: string;
  images?: ImportImage[];
}

/** Editable product columns: import-dialog labels + detection metadata. */
export const PRODUCT_FIELDS = [
  { key: "title", label: "Nomi" },
  { key: "price", label: "Narx" },
  { key: "costPrice", label: "Tan narx" },
  { key: "quantity", label: "Zaxira" },
  { key: "ikpu", label: "IKPU" },
  { key: "vatRate", label: "QQS %" },
  { key: "barcode", label: "Shtrix-kod" },
  { key: "category", label: "Kategoriya" },
  { key: "subCategory", label: "Subkategoriya" },
  { key: "description", label: "Tavsif" },
  { key: "isNew", label: "Yangi (New)" },
  { key: "isBest", label: "Top (Best)" },
] as const;

export type ProductFieldKey = (typeof PRODUCT_FIELDS)[number]["key"];

// Human-first column order (business fields first, the technical key last) —
// mirrors how Shopify/WooCommerce lay out their product CSVs. Cost + Quantity
// drive margin and inventory; image URLs are omitted (images are preserved
// server-side on update, so the editable sheet stays clean).
export const PRODUCT_CSV_HEADERS = [
  "Title",
  "Price",
  "Cost",
  "Quantity",
  "IKPU",
  "VAT %",
  "Barcode",
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
  const rawImages =
    "productImageUrl" in rec && rec.productImageUrl !== undefined ? rec.productImageUrl : rec.images;
  return {
    id: String(rec.id ?? "").trim(),
    title: optStr(rec.title),
    price: optNum(rec.price),
    costPrice: optNum(rec.costPrice),
    quantity: optNum(rec.quantity),
    category: optStr(rec.category),
    subCategory: optStr(rec.subCategory ?? rec.subcategory),
    description: optStr(rec.description),
    isNew: optBool(rec.isNew),
    isBest: optBool(rec.isBest),
    ikpu: optStr(rec.ikpu),
    vatRate: optNum(rec.vatRate),
    barcode: optStr(rec.barcode),
    images: rawImages === undefined ? undefined : toImages(rawImages),
  };
}

export function productsToCSV(products: ProductT[]): string {
  const rows: unknown[][] = [PRODUCT_CSV_HEADERS as unknown as string[]];
  for (const p of products) {
    rows.push([
      p.title ?? "",
      p.price ?? "",
      p.costPrice ?? "",
      p.quantity ?? 0,
      p.ikpu ?? "",
      p.vatRate ?? "",
      p.barcode ?? "",
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
  const jsonRecords = tryParseJSONRecords(text, filename);
  if (jsonRecords) return jsonRecords.map(normalizeProduct);

  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const read = rowReader(rows[0]);
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) =>
      normalizeProduct({
        id: read(r, ["Product ID", "id"]),
        title: read(r, ["Title", "Name", "Nomi", "Nom", "Название", "Наименование"]),
        price: read(r, ["Price", "Narxi", "Narx", "Цена", "Regular price", "Variant Price"]),
        costPrice: read(r, ["Cost", "Cost price", "Tan narx", "Tannarx", "COGS", "Себестоимость"]),
        quantity: read(r, ["Quantity", "Qty", "Zaxira", "Miqdor", "Soni", "Stock", "Количество", "Остаток"]),
        category: read(r, ["Category", "Categories", "Kategoriya", "Категория"]),
        subCategory: read(r, ["Subcategory", "Sub Category", "Subkategoriya", "Подкатегория"]),
        description: read(r, ["Description", "Tavsif", "Описание", "Body"]),
        isNew: read(r, ["New", "Yangi", "Новый", "Новинка", "isNew"]),
        isBest: read(r, ["Best", "Top", "Хит", "isBest"]),
        ikpu: read(r, ["IKPU", "MXIK", "IKPU/MXIK", "ИКПУ", "МХИК"]),
        vatRate: read(r, ["VAT %", "VAT", "QQS", "QQS %", "НДС"]),
        barcode: read(r, ["Barcode", "Shtrix-kod", "Shtrix kod", "Штрихкод", "Штрих-код"]),
        images: read(r, ["Images", "Image Src", "Rasmlar"]),
      })
    );
}

/** Which editable columns does this file actually contain (≥1 filled cell)? */
export function detectProductColumns(items: ImportProduct[]): ColumnOption[] {
  return PRODUCT_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    count: items.filter((it) => it[f.key] !== undefined).length,
  }));
}

/** Fields that are both provided by the file row and enabled by the user —
 *  this is exactly what gets written on update / overrides defaults on create. */
export function buildProductWrite(
  rec: ImportProduct,
  enabled: Set<string>
): Partial<Record<ProductFieldKey, unknown>> {
  const data: Partial<Record<ProductFieldKey, unknown>> = {};
  for (const { key } of PRODUCT_FIELDS) {
    if (!enabled.has(key)) continue;
    const v = rec[key];
    if (v !== undefined) data[key] = v;
  }
  return data;
}

/** Dry-run of the import — powers the live preview in the confirm dialog.
 *  A row whose Product ID matches the store is an update; any other row
 *  (blank ID, or an ID that isn't in the store) becomes a new product as long
 *  as a Title is provided. This mirrors the category importer and guarantees
 *  the "Import qilish" button is never a dead end when a file has real rows. */
export function planProductImport(
  items: ImportProduct[],
  existingIds: Set<string>,
  enabled: Set<string>
): ImportPlan {
  let create = 0;
  let update = 0;
  let skip = 0;
  for (const rec of items) {
    if (rec.id && existingIds.has(rec.id)) {
      if (Object.keys(buildProductWrite(rec, enabled)).length) update++;
      else skip++;
    } else if (enabled.has("title") && rec.title) {
      create++;
    } else {
      skip++;
    }
  }
  return { create, update, skip };
}

/* -------------------------------- categories ------------------------------- */

export interface ImportCategory {
  id: string;
  name?: string;
  subcategory?: string[];
}

export const CATEGORY_FIELDS = [
  { key: "name", label: "Nomi" },
  { key: "subcategory", label: "Subkategoriyalar" },
] as const;

export type CategoryFieldKey = (typeof CATEGORY_FIELDS)[number]["key"];

function normalizeCategory(rec: Record<string, unknown>): ImportCategory {
  let subcategory: string[] | undefined;
  if (Array.isArray(rec.subcategory)) {
    subcategory = rec.subcategory.map((s) => String(s).trim()).filter(Boolean);
  } else if (optStr(rec.subcategory) !== undefined) {
    subcategory = String(rec.subcategory)
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return {
    id: String(rec.id ?? "").trim(),
    name: optStr(rec.name),
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
  const jsonRecords = tryParseJSONRecords(text, filename);
  if (jsonRecords) return jsonRecords.map(normalizeCategory);

  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const read = rowReader(rows[0]);
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) =>
      normalizeCategory({
        id: read(r, ["Category ID", "id"]),
        name: read(r, ["Name", "Nomi", "Название"]),
        subcategory: read(r, ["Subcategories", "Subcategory", "Subkategoriya", "Подкатегории"]),
      })
    );
}

export function detectCategoryColumns(items: ImportCategory[]): ColumnOption[] {
  return CATEGORY_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    count: items.filter((it) => it[f.key] !== undefined).length,
  }));
}

export function buildCategoryWrite(
  rec: ImportCategory,
  enabled: Set<string>
): Partial<Record<CategoryFieldKey, unknown>> {
  const data: Partial<Record<CategoryFieldKey, unknown>> = {};
  for (const { key } of CATEGORY_FIELDS) {
    if (!enabled.has(key)) continue;
    const v = rec[key];
    if (v !== undefined) data[key] = v;
  }
  return data;
}

export function planCategoryImport(
  items: ImportCategory[],
  existingIds: Set<string>,
  enabled: Set<string>
): ImportPlan {
  let create = 0;
  let update = 0;
  let skip = 0;
  for (const rec of items) {
    if (rec.id && existingIds.has(rec.id)) {
      if (Object.keys(buildCategoryWrite(rec, enabled)).length) update++;
      else skip++;
    } else if (enabled.has("name") && rec.name) {
      create++;
    } else {
      skip++;
    }
  }
  return { create, update, skip };
}

/* -------------------------------- customers -------------------------------- */
// Customers are keyed by normalized phone. Export carries computed metrics
// (read-only); import only writes the editable enrichment (name/city/tags/note)
// into the `customers` collection. Metrics columns are ignored on import.

export interface ImportCustomer {
  phone: string; // normalized key
  name?: string;
  city?: string;
  tags?: string[];
  note?: string;
}

export const CUSTOMER_FIELDS = [
  { key: "name", label: "Ism" },
  { key: "city", label: "Shahar" },
  { key: "tags", label: "Belgilar" },
  { key: "note", label: "Izoh" },
] as const;

export type CustomerFieldKey = (typeof CUSTOMER_FIELDS)[number]["key"];

function normalizeImportCustomer(rec: Record<string, unknown>): ImportCustomer {
  let tags: string[] | undefined;
  if (Array.isArray(rec.tags)) tags = rec.tags.map((t) => String(t).trim()).filter(Boolean);
  else if (optStr(rec.tags) !== undefined)
    tags = String(rec.tags)
      .split(/[,|]/)
      .map((t) => t.trim())
      .filter(Boolean);
  return {
    phone: normalizePhone(rec.phone),
    name: optStr(rec.name),
    city: optStr(rec.city),
    tags,
    note: optStr(rec.note),
  };
}

export function customersToCSV(customers: CustomerT[]): string {
  const rows: unknown[][] = [
    [
      "Name",
      "Phone",
      "City",
      "Tags",
      "Note",
      "Order Count",
      "Total Spent (UZS)",
      "Avg Ticket (UZS)",
      "First Order",
      "Last Order",
    ],
  ];
  for (const c of customers) {
    rows.push([
      c.name ?? "",
      c.displayPhone ?? "",
      c.city ?? "",
      (c.tags ?? []).join(", "),
      c.note ?? "",
      c.orderCount ?? 0,
      c.totalSpent ?? 0,
      c.avgTicket ?? 0,
      c.firstOrderAt ? new Date(c.firstOrderAt).toISOString().slice(0, 10) : "",
      c.lastOrderAt ? new Date(c.lastOrderAt).toISOString().slice(0, 10) : "",
    ]);
  }
  return toCSV(rows);
}

export function parseCustomersFile(text: string, filename: string): ImportCustomer[] {
  const jsonRecords = tryParseJSONRecords(text, filename);
  if (jsonRecords) return jsonRecords.map(normalizeImportCustomer).filter((c) => c.phone);

  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const read = rowReader(rows[0]);
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) =>
      normalizeImportCustomer({
        phone: read(r, ["Phone", "Telefon", "Телефон", "phone"]),
        name: read(r, ["Name", "Ism", "Имя", "Mijoz"]),
        city: read(r, ["City", "Shahar", "Город"]),
        tags: read(r, ["Tags", "Belgilar", "Teglar", "Теги"]),
        note: read(r, ["Note", "Izoh", "Заметка", "Примечание"]),
      })
    )
    .filter((c) => c.phone); // drop rows without a usable phone
}

export function detectCustomerColumns(items: ImportCustomer[]): ColumnOption[] {
  return CUSTOMER_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    count: items.filter((it) => it[f.key] !== undefined).length,
  }));
}

export function buildCustomerWrite(
  rec: ImportCustomer,
  enabled: Set<string>
): Partial<Record<CustomerFieldKey, unknown>> {
  const data: Partial<Record<CustomerFieldKey, unknown>> = {};
  for (const { key } of CUSTOMER_FIELDS) {
    if (!enabled.has(key)) continue;
    const v = rec[key];
    if (v !== undefined) data[key] = v;
  }
  return data;
}

export function planCustomerImport(
  items: ImportCustomer[],
  existingPhones: Set<string>,
  enabled: Set<string>
): ImportPlan {
  let create = 0;
  let update = 0;
  let skip = 0;
  for (const rec of items) {
    if (!rec.phone || !Object.keys(buildCustomerWrite(rec, enabled)).length) {
      skip++;
    } else if (existingPhones.has(rec.phone)) {
      update++;
    } else {
      create++;
    }
  }
  return { create, update, skip };
}

/* ---------------------------------- orders --------------------------------- */
// Orders are export-only (you don't bulk-import customer orders).

export function ordersToCSV(orders: Order[]): string {
  const rows: unknown[][] = [
    [
      "Order No",
      "Date",
      "Status",
      "Channel",
      "Customer",
      "Phone",
      "Items",
      "Total Quantity",
      "Total Price (UZS)",
      "Cost (UZS)",
      "Profit (UZS)",
      "Payment",
      "Cashier",
      "Order ID",
    ],
  ];
  for (const o of orders) {
    const items = (o.basketItems ?? [])
      .map((it) => `${it.title} x${it.quantity ?? 1}`)
      .join(" | ");
    const customer = `${o.clientName ?? ""} ${o.clientLastName ?? ""}`.trim();
    // Cost of goods from the per-line snapshot (status-independent for the raw
    // ledger — the Status column tells the reader if it was cancelled).
    let cogs = 0;
    for (const it of o.basketItems ?? []) {
      const c = it as unknown as { costAtSale?: number; costPrice?: number; quantity?: number };
      cogs += (Number(c.costAtSale ?? c.costPrice ?? 0) || 0) * (Number(c.quantity) || 0);
    }
    const revenue = Number(o.totalPrice) || 0;
    rows.push([
      o.orderNo ?? "",
      formatDateTime(o.date),
      orderStatusMeta(o.status).label,
      o.channel === "store" ? "Doʼkon" : "Sayt",
      customer,
      o.clientPhone ?? "",
      items,
      o.totalQuantity ?? "",
      revenue,
      cogs || "",
      cogs ? revenue - cogs : "",
      o.paymentMethod ?? "",
      o.cashierUid ?? "",
      o.id ?? "",
    ]);
  }
  return toCSV(rows);
}
