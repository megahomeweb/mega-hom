"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoArrowLeft, GoTrash } from "react-icons/go";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import { useOrderStore } from "@/zustand/useOrderStore";
import { useRole } from "@/components/admin/RoleContext";
import { isManagerPlus, isAdminPlus } from "@/lib/roles";
import NoAccess from "@/components/admin/NoAccess";
import ReportsExplainer from "@/components/admin/ReportsExplainer";
import { FormattedPrice } from "@/utils";
import { dailySeries, byCategory, aggregateOrders, startOfDaysAgo } from "@/lib/reports";

type Period = 7 | 30 | 90;

// Danger-zone reset scopes. Partial scopes delete only that window's orders
// ([from, to) on the order date) — other periods' history stays.
type WipeScope = "today" | "week" | "month" | "range" | "all";
const WIPE_SCOPES: { value: WipeScope; label: string }[] = [
  { value: "today", label: "Bugun" },
  { value: "week", label: "Oxirgi 7 kun" },
  { value: "month", label: "Shu oy" },
  { value: "range", label: "Sana oraligʻi" },
  { value: "all", label: "Hammasi" },
];
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const compact = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
};
// Custom tooltip — formats values as UZS (avoids recharts' strict formatter type).
const MoneyTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  label?: string;
  payload?: { name?: string; value?: number | string; color?: string }[];
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <b>{FormattedPrice(Number(p.value))} UZS</b>
        </p>
      ))}
    </div>
  );
};

const card = "rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-center";
const panel = "rounded-xl border border-brand-100 bg-white p-4";

const AnalyticsPage = () => {
  const me = useRole();
  const { orders, fetchAllOrders, deleteAllOrders, deleteOrdersInRange } = useOrderStore();
  const [period, setPeriod] = useState<Period>(30);
  const [mounted, setMounted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [wiping, setWiping] = useState(false);
  // Tozalash scope — which slice of history the danger zone removes.
  const [wipeScope, setWipeScope] = useState<WipeScope>("today");
  const [wipeFrom, setWipeFrom] = useState(() => toISODate(new Date()));
  const [wipeTo, setWipeTo] = useState(() => toISODate(new Date()));
  // Admin+ (Administrator/Egasi) can wipe reports — destructive, but the
  // type-to-confirm modal below is the real guard, and rules already allow
  // admin+ to delete orders. Managers can view analytics but not wipe them.
  const canWipe = isAdminPlus(me?.role);

  // [fromMs, toMs) window for the chosen scope; null = full wipe. Upper bound
  // is the NEXT day's midnight (exclusive), so "Bugun"/the "to" date cover the
  // whole day regardless of wall clock.
  const wipeWindow = useMemo((): { fromMs: number; toMs: number } | null => {
    const now = new Date();
    const tomorrow0 = dayStart(now).getTime() + 86_400_000;
    switch (wipeScope) {
      case "today":
        return { fromMs: dayStart(now).getTime(), toMs: tomorrow0 };
      case "week":
        return { fromMs: dayStart(now).getTime() - 6 * 86_400_000, toMs: tomorrow0 };
      case "month":
        return { fromMs: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), toMs: tomorrow0 };
      case "range": {
        const f = new Date(`${wipeFrom}T00:00:00`);
        const t = new Date(`${wipeTo}T00:00:00`);
        if (isNaN(f.getTime()) || isNaN(t.getTime()) || f.getTime() > t.getTime()) return null;
        return { fromMs: f.getTime(), toMs: t.getTime() + 86_400_000 };
      }
      case "all":
        return null;
    }
  }, [wipeScope, wipeFrom, wipeTo]);

  // Advisory pre-count so the admin sees exactly what the wipe will hit
  // (the delete re-queries server-side; rules stay the real boundary).
  const wipeMatchCount = useMemo(() => {
    if (!wipeWindow) return orders.length;
    let n = 0;
    for (const o of orders) {
      const ms = o.date?.seconds ? o.date.seconds * 1000 : 0;
      if (ms >= wipeWindow.fromMs && ms < wipeWindow.toMs) n++;
    }
    return n;
  }, [orders, wipeWindow]);

  const wipeScopeLabel = WIPE_SCOPES.find((s) => s.value === wipeScope)?.label ?? "";
  const wipePeriodText = wipeWindow
    ? `${new Date(wipeWindow.fromMs).toLocaleDateString()} — ${new Date(wipeWindow.toMs - 1).toLocaleDateString()}`
    : "";
  const wipeRangeInvalid = wipeScope === "range" && !wipeWindow;

  const handleWipe = async () => {
    if (confirmText.trim().toUpperCase() !== "OCHIRISH") return;
    setWiping(true);
    try {
      const n = wipeWindow
        ? await deleteOrdersInRange(wipeWindow.fromMs, wipeWindow.toMs)
        : await deleteAllOrders();
      toast.success(
        wipeWindow
          ? `${wipeScopeLabel}: ${n} ta buyurtma oʼchirildi — davr hisobotlari tozalandi`
          : `${n} ta buyurtma oʼchirildi — hisobotlar tozalandi`
      );
      setConfirmOpen(false);
      setConfirmText("");
    } catch (e) {
      console.error(e);
      toast.error("Oʼchirishda xatolik — qaytadan urinib koʼring");
    } finally {
      setWiping(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
    setMounted(true);
  }, [fetchAllOrders]);

  const series = useMemo(() => dailySeries(orders, period), [orders, period]);
  const cats = useMemo(
    () => byCategory(orders, { from: startOfDaysAgo(period) }).slice(0, 7),
    [orders, period]
  );
  const agg = useMemo(() => aggregateOrders(orders, { from: startOfDaysAgo(period) }), [orders, period]);
  const labelInterval = period <= 7 ? 0 : period <= 30 ? 3 : 9;

  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link href="/admin-dashboard" className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-brand-500 mb-3">
        <GoArrowLeft className="text-xl" />
        <span>Admin panelga qaytish</span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-brand">Savdo tahlili</h1>
        <div className="flex gap-1">
          {([7, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                period === p ? "bg-brand text-white border-brand" : "bg-white text-slate-500 border-brand-100 hover:bg-brand-50"
              }`}
            >
              {p} kun
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className={card}>
          <p className="text-xs text-slate-500">Savdo</p>
          <p className="text-lg sm:text-2xl font-bold text-brand">{FormattedPrice(agg.revenue)}</p>
          {agg.vat > 0 && (
            <p className="text-[10px] text-slate-400">
              shu jumladan QQS {FormattedPrice(Math.round(agg.vat))}
            </p>
          )}
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Yalpi foyda</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{FormattedPrice(agg.profit)}</p>
          <p className="text-[10px] text-slate-400">savdo − tan narx</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Buyurtma</p>
          <p className="text-lg sm:text-2xl font-bold text-brand">{agg.count}</p>
        </div>
      </div>

      <ReportsExplainer />

      {!mounted ? (
        <div className="flex justify-center py-20"><Loader /></div>
      ) : (
        <div className="space-y-5">
          <div className={panel}>
            <h3 className="font-bold text-slate-700 mb-3">Savdo va foyda (kunlik)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={series} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DD2426" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#DD2426" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e8e8" vertical={false} />
                <XAxis dataKey="label" interval={labelInterval} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "#94a3b8" }} width={40} tickLine={false} axisLine={false} />
                <Tooltip content={<MoneyTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Savdo" stroke="#DD2426" strokeWidth={2} fill="url(#gRev)" />
                <Area type="monotone" dataKey="profit" name="Foyda" stroke="#16a34a" strokeWidth={2} fill="url(#gProf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={panel}>
            <h3 className="font-bold text-slate-700 mb-3">Buyurtmalar soni (kunlik)</h3>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={series} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e8e8" vertical={false} />
                <XAxis dataKey="label" interval={labelInterval} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={28} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #f1d5d5", fontSize: 12 }} />
                <Bar dataKey="count" name="Buyurtma" fill="#DD2426" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {cats.length > 0 && (
            <div className={panel}>
              <h3 className="font-bold text-slate-700 mb-3">Kategoriyalar boʼyicha savdo</h3>
              <ResponsiveContainer width="100%" height={Math.max(160, cats.length * 42)}>
                <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1e8e8" horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="category" width={88} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<MoneyTooltip />} />
                  <Bar dataKey="revenue" name="Savdo" fill="#DD2426" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {agg.count === 0 && (
            <p className="text-center text-slate-400 py-10">Bu davrda savdo maʼlumoti yoʼq.</p>
          )}
        </div>
      )}

      {/* Danger zone — admin+: period-scoped report reset. Partial scopes
          delete only the chosen window's orders; "Hammasi" wipes everything. */}
      {canWipe && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <h3 className="font-bold text-brand-700 flex items-center gap-2">
            <GoTrash /> Xavfli hudud — hisobotlarni tozalash
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Davrni tanlang — faqat shu davrdagi buyurtmalar (veb va kassa) oʼchiriladi va oʼsha
            davr hisobotlari nolga qaytadi. Bu amalni <b>qaytarib boʼlmaydi</b>. Avval
            maʼlumotlarni CSV ga eksport qilib saqlang.
          </p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {WIPE_SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setWipeScope(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  wipeScope === s.value
                    ? s.value === "all"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-brand text-white border-brand"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {wipeScope === "range" && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <input
                type="date"
                value={wipeFrom}
                max={wipeTo}
                onChange={(e) => setWipeFrom(e.target.value)}
                aria-label="Boshlanish sanasi"
                className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none focus:border-brand"
              />
              <span className="text-slate-400">—</span>
              <input
                type="date"
                value={wipeTo}
                min={wipeFrom}
                onChange={(e) => setWipeTo(e.target.value)}
                aria-label="Tugash sanasi"
                className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none focus:border-brand"
              />
            </div>
          )}

          <p className="text-xs mt-2.5">
            {wipeRangeInvalid ? (
              <span className="text-red-600 font-semibold">Sana oraligʻi notoʼgʼri — boshlanish sanasi tugash sanasidan katta.</span>
            ) : wipeWindow ? (
              <span className={wipeMatchCount === 0 ? "text-slate-400" : "text-red-700 font-semibold"}>
                {wipePeriodText}: {wipeMatchCount} ta buyurtma oʼchiriladi · boshqa davrlar saqlanadi
              </span>
            ) : (
              <span className="text-red-700 font-semibold">
                BARCHA {orders.length}{orders.length >= 1000 ? "+" : ""} ta buyurtma oʼchiriladi
              </span>
            )}
          </p>

          <button
            onClick={() => { setConfirmText(""); setConfirmOpen(true); }}
            disabled={wipeRangeInvalid || wipeMatchCount === 0}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <GoTrash /> {wipeWindow ? `Tozalash: ${wipeScopeLabel}` : "Barcha hisobotlarni oʼchirish"}
          </button>
        </div>
      )}

      {/* Type-to-confirm modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !wiping && setConfirmOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-brand-700 flex items-center gap-2">
              <GoTrash /> {wipeWindow ? `Tozalash: ${wipeScopeLabel}` : "Barcha hisobotlarni oʼchirish"}
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              {wipeWindow ? (
                <>
                  <b>{wipePeriodText}</b> oraligʻidagi <b>{wipeMatchCount}</b> ta buyurtma butunlay
                  oʼchiriladi. Boshqa davrlardagi buyurtmalar va hisobotlar <b>saqlanadi</b>. Bu
                  amalni qaytarib boʼlmaydi.
                </>
              ) : orders.length > 0 ? (
                <>Hozir <b>{orders.length}{orders.length >= 1000 ? "+" : ""}</b> ta buyurtma mavjud. Barchasi butunlay oʼchiriladi va qaytarib boʼlmaydi.</>
              ) : (
                <>Oʼchiriladigan buyurtma topilmadi.</>
              )}
            </p>
            <p className="text-sm text-slate-600 mt-3">
              Tasdiqlash uchun <b className="font-mono text-brand-700">OCHIRISH</b> deb yozing:
            </p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="OCHIRISH"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setConfirmOpen(false); setConfirmText(""); }}
                disabled={wiping}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleWipe}
                disabled={wiping || confirmText.trim().toUpperCase() !== "OCHIRISH"}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {wiping ? "Oʼchirilmoqda…" : wipeWindow ? "Davrni oʼchirish" : "Butunlay oʼchirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
