"use client";
import { useEffect } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import Loader from "@/components/Loader";
import useStockStore from "@/zustand/useStockStore";
import { useRole } from "@/components/admin/RoleContext";
import { isManagerPlus } from "@/lib/roles";
import NoAccess from "@/components/admin/NoAccess";

const TYPE_BADGE: Record<string, string> = {
  kirim: "bg-green-100 text-green-700",
  chiqim: "bg-red-100 text-red-700",
  tuzatish: "bg-blue-100 text-blue-700",
};
const TYPE_LABEL: Record<string, string> = { kirim: "Kirim", chiqim: "Chiqim", tuzatish: "Tuzatish" };

// Ombor harakatlari — the append-only inventory ledger (manual receives,
// write-offs, corrections). Sales/returns are recorded in `orders`, not here.
const InventoryPage = () => {
  const me = useRole();
  const { movements, loading, fetchMovements } = useStockStore();

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link
        href="/admin-dashboard"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-pink-500 mb-3"
      >
        <GoArrowLeft className="text-xl" />
        <span>Admin panelga qaytish</span>
      </Link>
      <h1 className="text-xl font-bold text-pink-500 mb-1">Ombor harakatlari</h1>
      <p className="text-sm text-slate-500 mb-4">
        Zaxira oʼzgarishlari tarixi (kirim, chiqim, tuzatish). Zaxirani{" "}
        <b>Mahsulotlar</b> jadvalida 📦 tugmasi orqali oʼzgartiring. Sotuvlar buyurtmalarda qayd
        etiladi.
      </p>

      {loading && movements.length === 0 && (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}
      {!loading && movements.length === 0 && (
        <p className="text-center text-slate-400 py-16">Hozircha harakatlar yoʼq.</p>
      )}

      {movements.length > 0 && (
        <div className="overflow-x-auto">
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
                  <td className="py-2 px-3 text-right">{m.newQty}</td>
                  <td className="py-2 px-3 text-slate-500">{m.reason || "—"}</td>
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
