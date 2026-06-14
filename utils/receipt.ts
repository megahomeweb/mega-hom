// Thermal-printer receipt (chek) generator — shared by the POS counter and the
// orders screen. Receipts print on standard thermal rolls, which come in two
// physical widths: 80mm (the common counter printer) and 58mm (compact). We
// render to those exact widths via `@page { size: <w>mm auto }` so the output
// fits the paper instead of an A4 sheet. Built with DOM nodes — textContent
// escapes every customer-provided value (no innerHTML on user data).

import { FormattedPrice } from "@/utils";

export interface ReceiptItem {
  title: string;
  quantity: number;
  price: number;     // unit price
  vatRate?: number;  // % (UZ prices are VAT-inclusive)
}

export interface ReceiptInput {
  orderNo?: string;
  dateMs?: number;
  cashier?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  total: number;
  cash?: number;           // tendered (POS cash sale)
  change?: number;
  paymentMethod?: string;
  deliveryAddress?: string;
  note?: string;
  widthMm?: 58 | 80;       // thermal roll width (default 80)
  heading?: string;        // "CHEK" (sale) | "BUYURTMA" (order slip)
}

const PAY_LABELS: Record<string, string> = {
  naqd: "Naqd",
  karta: "Karta",
  card: "Karta",
  transfer: "Oʼtkazma",
};

export function printReceipt(input: ReceiptInput): boolean {
  if (typeof window === "undefined") return false;
  const widthMm = input.widthMm ?? 80;
  const contentMm = widthMm === 58 ? 50 : 72;

  const win = window.open("", "_blank", `width=${widthMm === 58 ? 300 : 380},height=640`);
  if (!win) return false;
  const d = win.document;
  d.title = `megahome — ${input.heading ?? "CHEK"} ${input.orderNo ?? ""}`.trim();

  const style = d.createElement("style");
  style.textContent = `
    @page { size: ${widthMm}mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body { width: ${contentMm}mm; margin: 0 auto; padding: 2mm 0 4mm;
           font-family: "Menlo","Consolas","Courier New",monospace; color: #111;
           font-size: 12px; line-height: 1.45; -webkit-font-smoothing: none; }
    .brand { text-align: center; font-weight: 800; font-size: 17px; letter-spacing: 1px; }
    .sub { text-align: center; font-size: 11px; color: #333; margin-top: 1px; }
    .heading { text-align: center; font-weight: 700; font-size: 12px; letter-spacing: 3px;
               margin: 6px 0 2px; }
    .rule { border: none; border-top: 1px dashed #999; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .row .r { text-align: right; white-space: nowrap; }
    .muted { color: #444; font-size: 11px; }
    .item-name { font-weight: 600; }
    .item-sub { display: flex; justify-content: space-between; color: #333; font-size: 11px; }
    .total { display: flex; justify-content: space-between; align-items: baseline;
             font-weight: 800; font-size: 15px; margin-top: 4px; }
    .total .r { font-size: 16px; }
    .pay { display: flex; justify-content: space-between; font-size: 12px; }
    .foot { text-align: center; margin-top: 8px; font-size: 11px; color: #333; }
    .ono { text-align: center; font-weight: 700; font-size: 13px; margin-top: 4px;
           letter-spacing: 1px; }
  `;
  d.head.appendChild(style);

  const el = (tag: string, cls?: string, text?: string) => {
    const n = d.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const rule = () => d.body.appendChild(el("hr", "rule"));
  const row = (left: string, right: string, cls = "row") => {
    const r = el("div", cls);
    r.appendChild(el("span", undefined, left));
    r.appendChild(el("span", "r", right));
    d.body.appendChild(r);
    return r;
  };

  // Header
  d.body.appendChild(el("div", "brand", "MEGA HOME"));
  d.body.appendChild(el("div", "sub", "megahome.uz"));
  d.body.appendChild(el("div", "heading", input.heading ?? "CHEK"));
  rule();

  // Meta
  if (input.orderNo) row("Chek №", input.orderNo, "row muted");
  row(
    "Sana",
    new Date(input.dateMs ?? Date.now()).toLocaleString("uz-UZ", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }),
    "row muted"
  );
  if (input.cashier) row("Kassir", input.cashier, "row muted");
  if (input.customerName || input.customerPhone)
    row("Mijoz", `${input.customerName ?? ""} ${input.customerPhone ?? ""}`.trim(), "row muted");
  rule();

  // Items
  let vatTotal = 0;
  for (const it of input.items) {
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.price) || 0;
    const line = qty * unit;
    if (it.vatRate && it.vatRate > 0) vatTotal += (line * it.vatRate) / (100 + it.vatRate);

    d.body.appendChild(el("div", "item-name", it.title || "—"));
    const sub = el("div", "item-sub");
    sub.appendChild(el("span", undefined, `${qty} × ${FormattedPrice(unit)}`));
    sub.appendChild(el("span", undefined, `${FormattedPrice(line)}`));
    d.body.appendChild(sub);
  }
  rule();

  // Totals
  const tot = el("div", "total");
  tot.appendChild(el("span", undefined, "JAMI"));
  tot.appendChild(el("span", "r", `${FormattedPrice(input.total)} UZS`));
  d.body.appendChild(tot);
  if (vatTotal > 0) row("shu jumladan QQS", `${FormattedPrice(Math.round(vatTotal))} UZS`, "pay muted");

  if (input.paymentMethod || input.cash !== undefined) {
    rule();
    row("Toʼlov", PAY_LABELS[input.paymentMethod ?? ""] ?? (input.paymentMethod || "Naqd"), "pay");
    if (input.cash !== undefined) row("Berildi", `${FormattedPrice(input.cash)} UZS`, "pay");
    if (input.change !== undefined && input.change >= 0)
      row("Qaytim", `${FormattedPrice(input.change)} UZS`, "pay");
  }

  // Delivery (order slips)
  if (input.deliveryAddress || input.note) {
    rule();
    if (input.deliveryAddress) d.body.appendChild(el("div", "muted", `Manzil: ${input.deliveryAddress}`));
    if (input.note) d.body.appendChild(el("div", "muted", `Izoh: ${input.note}`));
  }

  rule();
  d.body.appendChild(el("div", "foot", "Xaridingiz uchun rahmat! 🙏"));
  d.body.appendChild(el("div", "foot", "Qaytib keling — megahome.uz"));
  if (input.orderNo) d.body.appendChild(el("div", "ono", input.orderNo));

  // Give the popup a tick to lay out before invoking the print dialog.
  win.focus();
  win.setTimeout(() => {
    win.print();
  }, 250);
  return true;
}
