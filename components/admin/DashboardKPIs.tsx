"use client";
import { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/zustand/useOrderStore";
import { orderStatusMeta } from "@/lib/orderStatus";
import { aggregateOrders, startOfToday, startOfDaysAgo } from "@/lib/reports";
import useExpenseStore from "@/zustand/useExpenseStore";
import { FormattedPrice } from "@/utils";
import { motion, useReducedMotion } from "framer-motion";

const card = "rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center";
const cardContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const cardItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

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
  const { expenses, fetchExpenses } = useExpenseStore();
  const [period, setPeriod] = useState<Period>("today");
  const reduce = useReducedMotion();

  useEffect(() => {
    fetchAllOrders();
    fetchExpenses();
  }, [fetchAllOrders, fetchExpenses]);

  const kpi = useMemo(() => {
    const from =
      period === "today" ? startOfToday() : startOfDaysAgo(period === "7d" ? 7 : 30);
    const all = aggregateOrders(orders, { from });
    const web = aggregateOrders(orders, { from, channel: "web" });
    const store = aggregateOrders(orders, { from, channel: "store" });

    // Period expenses → true net profit = gross profit − expenses.
    let expenseTotal = 0;
    for (const e of expenses) {
      const ms = e.date?.seconds ? e.date.seconds * 1000 : 0;
      if (ms >= from) expenseTotal += Number(e.amount) || 0;
    }

    // Pending is an all-time operational queue, not period-scoped.
    let pending = 0;
    for (const o of orders) {
      const st = orderStatusMeta(o.status).key;
      if (st === "yangi" || st === "tasdiqlangan" || st === "yetkazilmoqda") pending++;
    }
    return { all, web, store, pending, expenseTotal, net: all.profit - expenseTotal };
  }, [orders, expenses, period]);

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

      <motion.div
        key={period}
        variants={cardContainer}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"
      >
        <motion.div variants={cardItem} className={card}>
          <p className="text-xs text-slate-500">Buyurtmalar</p>
          <p className="text-2xl font-bold text-pink-500">{kpi.all.count}</p>
          <p className="text-[10px] text-slate-400">{kpi.all.items} dona</p>
        </motion.div>
        <motion.div variants={cardItem} className={card}>
          <p className="text-xs text-slate-500">Savdo</p>
          <p className="text-2xl font-bold text-pink-500">{FormattedPrice(kpi.all.revenue)}</p>
          <p className="text-[10px] text-slate-400">
            Sayt {FormattedPrice(kpi.web.revenue)} · Doʼkon {FormattedPrice(kpi.store.revenue)}
          </p>
        </motion.div>
        <motion.div variants={cardItem} className={card}>
          <p className="text-xs text-slate-500">Yalpi foyda</p>
          <p className="text-2xl font-bold text-pink-500">{FormattedPrice(kpi.all.profit)}</p>
          <p className="text-[10px] text-slate-400">savdo − tan narx</p>
        </motion.div>
        <motion.div variants={cardItem} className={card}>
          <p className="text-xs text-slate-500">Xarajat</p>
          <p className="text-2xl font-bold text-pink-500">{FormattedPrice(kpi.expenseTotal)}</p>
          <p className="text-[10px] text-slate-400">davr boʼyicha</p>
        </motion.div>
        <motion.div variants={cardItem} className={card}>
          <p className="text-xs text-slate-500">Net foyda</p>
          <p className={`text-2xl font-bold ${kpi.net < 0 ? "text-red-500" : "text-green-600"}`}>
            {FormattedPrice(kpi.net)}
          </p>
          <p className="text-[10px] text-slate-400">foyda − xarajat</p>
        </motion.div>
        <motion.div variants={cardItem} className={card}>
          <p className="text-xs text-slate-500">Kutilayotgan</p>
          <p className="text-2xl font-bold text-pink-500">{kpi.pending}</p>
          <p className="text-[10px] text-slate-400">jami navbatda</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardKPIs;
