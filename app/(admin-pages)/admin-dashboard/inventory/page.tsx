"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import Loader from "@/components/Loader";
import useStockStore from "@/zustand/useStockStore";
import useProductStore from "@/zustand/useProductStore";
import { useRole } from "@/components/admin/RoleContext";
import { isManagerPlus } from "@/lib/roles";
import NoAccess from "@/components/admin/NoAccess";
import { FormattedPrice } from "@/utils";

const TYPE_BADGE: Record<string, string> = {
  kirim: "bg-green-100 text-green-700",
  chiqim: "bg-red-100 text-red-700",
  tuzatish: "bg-blue-100 text-blue-700",
  sotuv: "bg-teal-100 text-teal-700",
  qaytarish: "bg-orange-100 text-orange-700",
};
const TYPE_LABEL: Record<string, string> = {
  kirim: "Qoʼshish",
  chiqim: "Ayirish",
  tuzatish: "Tuzatish",
  sotuv: "Sotuv",
  qaytarish: "Qaytarish",
};

// Ombor harakatlari — the append-only inventory ledger (manual receives,
// write-offs, corrections). Sales/returns are recorded in `orders`, not here.
const InventoryPage = () => {
  const me = useRole();
  const { movements, loading, fetchMovements } = useStockStore();
  const { products, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchMovements();
    fetchProducts();
  }, [fetchMovements, fetchProducts]);

  // Inventory valuation — answers "Qoldiq va Tan narx qancha summa?". Qoldiq is
  // each product's on-hand `quantity`; Tan narx is its unit `costPrice`. The
  // ombor's worth at cost = Σ(quantity × costPrice); at retail = Σ(quantity ×
  // price); the gap is the margin still sitting on the shelves.
  const val = useMemo(() => {
    let units = 0, cost = 0, retail = 0, noCost = 0;
    for (const p of products) {
      const q = Number(p.quantity) || 0;
      const c = Number(p.costPrice) || 0;
      if (q > 0 && !p.costPrice) noCost++;
      units += q;
      cost += q * c;
      retail += q * (Number(p.price) || 0);
    }
    return { skus: products.length, units, cost, retail, profit: retail - cost, noCost };
  }, [products]);

  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link
        href="/admin-dashboard"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-brand mb-3"
      >
        <GoArrowLeft className="text-xl" />
        <span>Admin panelga qaytish</span>
      </Link>
      <div className="flex items-center justify-between mb-1 gap-3">
        <h1 className="text-xl font-bold text-brand">Ombor harakatlari</h1>
        <Link
          href="/admin-dashboard/suppliers"
          className="text-sm font-medium text-brand-600 hover:underline whitespace-nowrap"
        >
          Yetkazib beruvchilar →
        </Link>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Zaxiraning barcha harakatlari — qoʼshish, ayirish, tuzatish, sotuv va qaytarish.{" "}
        <b>Mahsulotlar</b> jadvalida 📦 tugmasi orqali qoʼlda oʼzgartiring; sotuv va qaytarishlar
        avtomatik yoziladi.
      </p>

      {/* Ombor qiymati — Qoldiq (on-hand) × Tan narx (cost) valuation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Jami qoldiq</p>
          <p className="text-lg sm:text-xl font-bold text-slate-700">
            {val.units.toLocaleString("ru-RU")} <span className="text-sm font-medium text-slate-400">dona</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{val.skus} ta mahsulot turi</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <p className="text-xs text-slate-500">Ombor qiymati — tan narx</p>
          <p className="text-lg sm:text-xl font-bold text-brand">
            {FormattedPrice(val.cost)} <span className="text-sm font-medium text-brand-400">soʼm</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Σ qoldiq × tan narx</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Ombor qiymati — sotuvda</p>
          <p className="text-lg sm:text-xl font-bold text-slate-700">
            {FormattedPrice(val.retail)} <span className="text-sm font-medium text-slate-400">soʼm</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Σ qoldiq × sotuv narx</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
          <p className="text-xs text-slate-500">Potensial foyda</p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            {FormattedPrice(val.profit)} <span className="text-sm font-medium text-green-500">soʼm</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">sotuvda − tan narx</p>
        </div>
      </div>
      {val.noCost > 0 && (
        <p className="-mt-3 mb-5 text-[11px] text-amber-600">
          ⚠ {val.noCost} ta mahsulotda tan narx kiritilmagan — ular tan narx qiymatiga kirmaydi.
        </p>
      )}

      {loading && movements.length === 0 && (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}
      {!loading && movements.length === 0 && (
        <p className="text-center text-slate-400 py-16">Hozircha harakatlar yoʼq.</p>
      )}

      {/* Mobile cards */}
      {movements.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {movements.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 capitalize truncate">{m.productTitle}</p>
                  <span className={`inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[m.type] ?? ""}`}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${m.delta < 0 ? "text-red-500" : m.delta > 0 ? "text-green-600" : "text-slate-400"}`}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </p>
                  <p className="text-[11px] text-slate-400">→ {m.newQty ?? "—"}</p>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : "—"}</span>
                {m.actorName && <span>{m.actorName}</span>}
              </div>
              {(m.reason || m.supplierName || m.orderNo) && (
                <p className="text-xs text-slate-500 mt-1">
                  {[m.reason, m.supplierName, m.orderNo].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      {movements.length > 0 && (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="py-2 px-3">Sana</th>
                <th className="py-2 px-3">Mahsulot</th>
                <th className="py-2 px-3">Tur</th>
                <th className="py-2 px-3 text-right">Oʼzgarish</th>
                <th className="py-2 px-3 text-right">Yangi qoldiq</th>
                <th className="py-2 px-3">Sabab</th>
                <th className="py-2 px-3">Kim</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                    {m.createdAt?.seconds
                      ? new Date(m.createdAt.seconds * 1000).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2 px-3 capitalize">{m.productTitle}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[m.type] ?? ""}`}>
                      {TYPE_LABEL[m.type] ?? m.type}
                    </span>
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold ${
                      m.delta < 0 ? "text-red-500" : m.delta > 0 ? "text-green-600" : "text-slate-400"
                    }`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td className="py-2 px-3 text-right">{m.newQty ?? "—"}</td>
                  <td className="py-2 px-3 text-slate-500">
                    {m.reason || "—"}
                    {m.supplierName && (
                      <span className="block text-xs text-slate-400">↳ {m.supplierName}</span>
                    )}
                    {m.orderNo && (
                      <span className="block text-xs font-mono text-slate-400">{m.orderNo}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-500">{m.actorName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
