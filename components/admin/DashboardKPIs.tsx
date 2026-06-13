"use client";
import { useEffect, useMemo } from "react";
import { useOrderStore } from "@/zustand/useOrderStore";
import { orderStatusMeta } from "@/lib/orderStatus";
import { FormattedPrice } from "@/utils";

const card = "rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center";

// At-a-glance pulse on the dashboard, computed in-memory from orders.
const DashboardKPIs = () => {
  const { orders, fetchAllOrders } = useOrderStore();

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const kpi = useMemo(() => {
    const d = new Date();
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    let todayOrders = 0;
    let todayRevenue = 0;
    let pending = 0;
    for (const o of orders) {
      const ts = o.date?.seconds ? o.date.seconds * 1000 : 0;
      if (ts >= dayStart) {
        todayOrders++;
        todayRevenue += Number(o.totalPrice) || 0;
      }
      const st = orderStatusMeta(o.status).key;
      if (st === "yangi" || st === "tasdiqlangan" || st === "yetkazilmoqda") pending++;
    }
    return { todayOrders, todayRevenue, total: orders.length, pending };
  }, [orders]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 mb-4">
      <div className={card}>
        <p className="text-xs text-slate-500">Bugungi buyurtmalar</p>
        <p className="text-2xl font-bold text-pink-500">{kpi.todayOrders}</p>
      </div>
      <div className={card}>
        <p className="text-xs text-slate-500">Bugungi savdo</p>
        <p className="text-2xl font-bold text-pink-500">{FormattedPrice(kpi.todayRevenue)}</p>
        <p className="text-[10px] text-slate-400">UZS</p>
      </div>
      <div className={card}>
        <p className="text-xs text-slate-500">Jami buyurtmalar</p>
        <p className="text-2xl font-bold text-pink-500">{kpi.total}</p>
      </div>
      <div className={card}>
        <p className="text-xs text-slate-500">Kutilayotgan</p>
        <p className="text-2xl font-bold text-pink-500">{kpi.pending}</p>
      </div>
    </div>
  );
};

export default DashboardKPIs;
