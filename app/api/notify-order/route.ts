import { NextRequest, NextResponse } from "next/server";

// Backend notification endpoint (Phase 1) — replaces the old, never-implemented
// /api/sendOrderEmail that silently 404'd on every checkout.
//
// The checkout (components/Modal.tsx) POSTs an order summary here AFTER the
// order is already saved to Firestore, so this route is best-effort: it must
// never block or fail the customer's checkout.
//
// The Telegram bot token is read from SERVER env vars and is never shipped to
// the browser. Set these in Vercel → Project → Settings → Environment Variables:
//   TELEGRAM_BOT_TOKEN  (from @BotFather)
//   TELEGRAM_CHAT_ID    (owner's chat or a group id; for a group, add the bot first)
// Until they're set the route succeeds quietly so checkout is unaffected.

export const runtime = "nodejs";

interface NotifyItem {
  title?: unknown;
  quantity?: unknown;
}
interface NotifyBody {
  customer?: unknown;
  phone?: unknown;
  total?: unknown;
  items?: unknown;
}

const clip = (v: unknown, n: number): string => String(v ?? "").slice(0, n);

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Not configured yet → 200 so the client treats it as a no-op.
  if (!token || !chatId) {
    return NextResponse.json({ ok: true, skipped: "not-configured" });
  }

  let body: NotifyBody;
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }

  const name = clip(body.customer, 120);
  const phone = clip(body.phone, 40);
  const total = clip(body.total, 40);
  const items: NotifyItem[] = Array.isArray(body.items) ? (body.items as NotifyItem[]).slice(0, 50) : [];
  const lines = items
    .map((it) => `• ${clip(it.title, 80)} × ${Number(it.quantity ?? 1) || 1}`)
    .join("\n");

  const text = [
    "🛒 Yangi buyurtma — megahome.uz",
    name && `👤 ${name}`,
    phone && `📞 ${phone}`,
    total && `💰 ${total} UZS`,
    lines && `\n${lines}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!tgRes.ok) {
      const detail = await tgRes.text().catch(() => "");
      console.error("Telegram notify failed:", tgRes.status, detail);
      return NextResponse.json({ ok: false, error: "telegram-failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("notify-order route error:", err);
    return NextResponse.json({ ok: false, error: "exception" }, { status: 500 });
  }
}
