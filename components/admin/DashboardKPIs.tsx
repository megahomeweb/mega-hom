"use client";
import { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/zustand/useOrderStore";
import { orderStatusMeta } from "@/lib/orderStatus";
import { aggregateOrders, startOfToday, startOfDaysAgo } from "@/lib/reports";
import { FormattedPrice } from "@/utils";

const card = "rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center";

type Period = "today" | "7d" | "30d";
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "7d", label: "7 kun" },
  { key: "30d", label: "30 kun" },
];

// At-a-glance pulse on the dashboard, computed in-memory from orders via the
// shared reports reducer. Revenue/profit EXCLUDE cancelled (bekor) orders.
const DashboardKPIs = () => {
  const { orders, fetchAllOrders } = useOrderStore();
  const [period, setPeriod] = useState<Period>("today");

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const kpi = useMemo(() => {
    const from =
      period === "today" ? startOfToday() : startOfDaysAgo(period === "7d" ? 7 : 30);
    const all = aggregateOrders(orders, { from });
    const web = aggregateOrders(orders, { from, channel: "web" });
    const store = aggregateOrders(orders, { from, channel: "store" });

    // Pending is an all-time operational queue, not period-scoped.
    let pending = 0;
    for (const o of orders) {
      const st = orderStatusMeta(o.status).key;
      if (st === "yangi" || st === "tasdiqlangan" || st === "yetkazilmoqda") pending++;
    }
    return { all, web, store, pending };
  }, [orders, period]);

  return (
    <div className="px-5 mb-4">
      {/* Period toggle */}
      <div className="flex items-center gap-1 mb-3">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
              period === p.key
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-white text-slate-500 border-pink-100 hover:bg-pink-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={card}>
          <p className="text-xs text-slate-500">Buyurtmalar</p>
          <p className="text-2xl font-bold text-pink-500">{kpi.all.count}</p>
          <p className="text-[10px] text-slate-400">{kpi.all.items} dona</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Savdo</p>
          <p className="text-2xl font-bold text-pink-500">{FormattedPrice(kpi.all.revenue)}</p>
          <p className="text-[10px] text-slate-400">
            Sayt {FormattedPrice(kpi.web.revenue)} · Doʼkon {FormattedPrice(kpi.store.revenue)}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Foyda</p>
          <p className="text-2xl font-bold text-pink-500">{FormattedPrice(kpi.all.profit)}</p>
          <p className="text-[10px] text-slate-400">tan narx kiritilsa aniq</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Kutilayotgan</p>
          <p className="text-2xl font-bold text-pink-500">{kpi.pending}</p>
          <p className="text-[10px] text-slate-400">jami navbatda</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardKPIs;
