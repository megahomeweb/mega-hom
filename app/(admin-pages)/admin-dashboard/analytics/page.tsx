"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import Loader from "@/components/Loader";
import { useOrderStore } from "@/zustand/useOrderStore";
import { useRole } from "@/components/admin/RoleContext";
import { isManagerPlus } from "@/lib/roles";
import NoAccess from "@/components/admin/NoAccess";
import { FormattedPrice } from "@/utils";
import { dailySeries, byCategory, aggregateOrders, startOfDaysAgo } from "@/lib/reports";

type Period = 7 | 30 | 90;

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
    <div className="rounded-lg border border-pink-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <b>{FormattedPrice(Number(p.value))} UZS</b>
        </p>
      ))}
    </div>
  );
};

const card = "rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center";
const panel = "rounded-xl border border-pink-100 bg-white p-4";

const AnalyticsPage = () => {
  const me = useRole();
  const { orders, fetchAllOrders } = useOrderStore();
  const [period, setPeriod] = useState<Period>(30);
  const [mounted, setMounted] = useState(false);

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
      <Link href="/admin-dashboard" className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-pink-500 mb-3">
        <GoArrowLeft className="text-xl" />
        <span>Admin panelga qaytish</span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-pink-500">Savdo tahlili</h1>
        <div className="flex gap-1">
          {([7, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                period === p ? "bg-pink-500 text-white border-pink-500" : "bg-white text-slate-500 border-pink-100 hover:bg-pink-50"
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
          <p className="text-lg sm:text-2xl font-bold text-pink-500">{FormattedPrice(agg.revenue)}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Foyda</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{FormattedPrice(agg.profit)}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Buyurtma</p>
          <p className="text-lg sm:text-2xl font-bold text-pink-500">{agg.count}</p>
        </div>
      </div>

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
                    <stop offset="0%" stopColor="#C21A1A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C21A1A" stopOpacity={0} />
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
                <Area type="monotone" dataKey="revenue" name="Savdo" stroke="#C21A1A" strokeWidth={2} fill="url(#gRev)" />
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
                <Bar dataKey="count" name="Buyurtma" fill="#ec4899" radius={[4, 4, 0, 0]} />
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
                  <Bar dataKey="revenue" name="Savdo" fill="#C21A1A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {agg.count === 0 && (
            <p className="text-center text-slate-400 py-10">Bu davrda savdo maʼlumoti yoʼq.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
