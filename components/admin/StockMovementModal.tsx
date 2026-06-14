"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";
import { ProductT, StockMovementType } from "@/lib/types";
import useStockStore from "@/zustand/useStockStore";
import { useRole } from "./RoleContext";

const TYPES: { key: StockMovementType; label: string; hint: string }[] = [
  { key: "kirim", label: "Kirim (+)", hint: "Yangi tovar keldi — zaxira oshadi" },
  { key: "chiqim", label: "Chiqim (−)", hint: "Yaroqsiz / yoʼqolgan — zaxira kamayadi" },
  { key: "tuzatish", label: "Tuzatish (=)", hint: "Sanab, aniq qoldiqni belgilash" },
];

// Receive / write-off / correct a single product's stock — writes the change AND
// a ledger row atomically (useStockStore.applyMovement). Opened from the product
// table; the admin area is already manager+ for catalog screens.
const StockMovementModal = ({ product, onClose }: { product: ProductT; onClose: () => void }) => {
  const me = useRole();
  const { applyMovement } = useStockStore();
  const [type, setType] = useState<StockMovementType>("kirim");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const current = Number(product.quantity) || 0;
  const magnitude = Math.abs(parseInt(qty, 10) || 0);
  const newQty =
    type === "kirim"
      ? current + magnitude
      : type === "chiqim"
        ? Math.max(0, current - magnitude)
        : magnitude;

  const apply = async () => {
    if (!qty || magnitude <= 0) return toast.error("Miqdorni kiriting");
    setBusy(true);
    try {
      await applyMovement({
        product,
        type,
        qty: magnitude,
        reason,
        actorUid: me?.uid ?? "",
        actorName: me?.name ?? "",
      });
      toast.success("Zaxira yangilandi");
      onClose();
    } catch {
      toast.error("Saqlab boʼlmadi (ruxsat yoki internet)");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-pink-300 text-slate-700 placeholder-slate-400";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-700">Zaxira harakati</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Yopish">
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600 truncate">
            <b className="capitalize">{product.title}</b>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`px-2 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  type === t.key
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">{TYPES.find((t) => t.key === type)?.hint}</p>
          <input
            type="number"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={type === "tuzatish" ? "Aniq qoldiq (dona)" : "Miqdor (dona)"}
            className={input}
            autoFocus
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sabab / izoh (ixtiyoriy)"
            className={input}
          />
          <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-500">
              Hozir: <b className="text-slate-700">{current}</b>
            </span>
            <span className="text-slate-400">→</span>
            <span className="text-slate-500">
              Yangi: <b className={newQty < current ? "text-red-500" : "text-green-600"}>{newQty}</b>
            </span>
          </div>
          <button
            onClick={apply}
            disabled={busy}
            className="w-full px-4 py-2.5 rounded-lg bg-pink-500 text-white font-bold hover:bg-pink-600 disabled:opacity-50"
          >
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockMovementModal;
