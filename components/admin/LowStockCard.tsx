"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { FiAlertTriangle } from "react-icons/fi";
import useProductStore from "@/zustand/useProductStore";

// Inventory → dashboard: surfaces exactly what needs reordering. A product is
// "low" when on-hand <= its lowStockThreshold (default 5); out-of-stock (0)
// sorts first. Each chip links straight to that product's restock form, so the
// alert is one click from the fix. Hidden entirely when nothing is low.
const LowStockCard = () => {
  const { products, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const low = useMemo(
    () =>
      products
        .filter((p) => !p.isHidden && (p.quantity ?? 0) <= (p.lowStockThreshold ?? 5))
        .sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0)),
    [products]
  );

  if (low.length === 0) return null;

  return (
    <div className="px-5 mb-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <FiAlertTriangle className="text-amber-500" />
          <h3 className="font-bold text-amber-700">Kam qolgan mahsulotlar ({low.length})</h3>
          <span className="text-xs text-amber-600/80">— bosib zaxirani toʼldiring</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {low.slice(0, 10).map((p) => {
            const out = (p.quantity ?? 0) <= 0;
            return (
              <Link
                key={p.id}
                href={`/admin-dashboard/update-product/${p.id}`}
                title="Zaxirani toʼldirish"
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  out
                    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                    : "bg-white border-amber-200 text-slate-700 hover:bg-amber-100"
                }`}
              >
                <span className="truncate max-w-[160px] capitalize">{p.title}</span>
                <span className="font-bold">{out ? "Tugadi" : p.quantity}</span>
              </Link>
            );
          })}
          {low.length > 10 && (
            <span className="inline-flex items-center px-2 text-sm text-amber-600">
              +{low.length - 10} ta
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LowStockCard;
