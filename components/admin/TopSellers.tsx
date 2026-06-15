"use client";
import { useEffect, useMemo } from "react";
import { useOrderStore } from "@/zustand/useOrderStore";
import { isRealized } from "@/lib/reports";
import { FormattedPrice } from "@/utils";

// Eng koʼp sotilgan — top products by units sold, aggregated from realized order
// line items (cancelled + returned orders excluded). Answers "what actually sells".
const TopSellers = () => {
  const { orders, fetchAllOrders } = useOrderStore();

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const top = useMemo(() => {
    const map = new Map<string, { title: string; units: number; revenue: number }>();
    for (const o of orders) {
      if (!isRealized(o)) continue;
      for (const it of o.basketItems ?? []) {
        const key = (it as { id?: string }).id || it.title || "—";
        const qty = Number(it.quantity) || 0;
        const rev = (Number(it.price) || 0) * qty;
        const cur = map.get(key) ?? { title: it.title || "—", units: 0, revenue: 0 };
        cur.units += qty;
        cur.revenue += rev;
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.units - a.units).slice(0, 8);
  }, [orders]);

  if (top.length === 0) return null;

  return (
    <div className="px-5 mb-4">
      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <h3 className="font-bold text-slate-700 mb-3">Eng koʼp sotilgan mahsulotlar</h3>
        <div className="space-y-1.5">
          {top.map((p, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-center font-bold text-brand-600">{i + 1}</span>
              <span className="flex-1 min-w-0 truncate text-slate-700 capitalize">{p.title}</span>
              <span className="text-slate-500 whitespace-nowrap">
                <b className="text-slate-700">{p.units}</b> dona
              </span>
              <span className="w-28 text-right font-semibold text-brand-600">
                {FormattedPrice(p.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopSellers;
