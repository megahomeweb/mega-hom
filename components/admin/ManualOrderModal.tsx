"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Timestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { FiSearch, FiPlus, FiMinus, FiTrash2, FiX } from "react-icons/fi";
import useProductStore from "@/zustand/useProductStore";
import { useOrderStore } from "@/zustand/useOrderStore";
import { ProductT } from "@/lib/types";
import { FormattedPrice } from "@/utils";
import NoPhoto from "../NoPhoto";

interface Line {
  product: ProductT;
  qty: number;
}

// Create an order BY HAND — phone / Telegram / walk-in delivery orders that the
// storefront never sees. It writes the SAME shape as a web checkout
// (channel:"web", status:"yangi"), so it flows through the exact same pipeline:
// fulfillment → stock decrement on confirm → CRM → KPIs. NOT a POS cash sale
// (that's "Kassa", which completes + decrements immediately).
const ManualOrderModal = ({
  onClose,
  prefill,
}: {
  onClose: () => void;
  prefill?: { name?: string; phone?: string };
}) => {
  const { products, fetchProducts } = useProductStore();
  const { addOrder } = useOrderStore();

  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => !p.isHidden);
    if (!q) return list.slice(0, 24);
    return list
      .filter(
        (p) =>
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q)
      )
      .slice(0, 24);
  }, [products, search]);

  const addLine = (p: ProductT) =>
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { product: p, qty: 1 }];
    });
  const bump = (id: string, delta: number) =>
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.product.id !== id) return [l];
        const qty = l.qty + delta;
        return qty <= 0 ? [] : [{ ...l, qty }];
      })
    );
  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.product.id !== id));

  const totalPrice = useMemo(
    () => lines.reduce((a, l) => a + (Number(l.product.price) || 0) * l.qty, 0),
    [lines]
  );
  const totalQty = useMemo(() => lines.reduce((a, l) => a + l.qty, 0), [lines]);

  const submit = async () => {
    if (!lines.length) return toast.error("Kamida bitta mahsulot qoʼshing");
    if (!phone.trim()) return toast.error("Mijoz telefonini kiriting");
    setBusy(true);
    try {
      // basketItems mirror the web cart: full product + ORDERED quantity, so the
      // cost snapshot (costPrice) and the confirm-time stock decrement both work.
      const basketItems = lines.map((l) => ({ ...l.product, quantity: l.qty }));
      await addOrder({
        id: "",
        clientName: name.trim(),
        clientLastName: "",
        clientPhone: phone.trim(),
        date: Timestamp.now(),
        basketItems,
        totalPrice,
        totalQuantity: totalQty,
        channel: "web",
        status: "yangi",
        deliveryAddress: address.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success("Buyurtma yaratildi");
      onClose();
    } catch {
      toast.error("Buyurtmani yaratib boʼlmadi");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-700">Yangi buyurtma (telefon / qoʼlda)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Yopish">
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 p-5 overflow-y-auto">
          {/* LEFT: product picker */}
          <div>
            <div className="relative mb-2">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mahsulot qidiring…"
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addLine(p)}
                  className="border border-slate-200 rounded-lg p-1.5 text-left hover:border-brand-400 transition"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded mb-1 bg-slate-50">
                    {p.productImageUrl?.[0]?.url ? (
                      <Image src={p.productImageUrl[0].url} alt={p.title} fill className="object-cover" />
                    ) : (
                      <NoPhoto className="absolute inset-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-700 line-clamp-2 leading-tight min-h-7">{p.title}</p>
                  <p className="text-[11px] text-brand-600 font-bold">{FormattedPrice(p.price)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: lines + customer */}
          <div className="flex flex-col">
            <h3 className="font-semibold text-slate-700 text-sm mb-2">Savatcha ({totalQty})</h3>
            {lines.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                Chapdan mahsulot tanlang
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mb-3">
                {lines.map((l) => (
                  <div key={l.product.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{l.product.title}</p>
                      <p className="text-xs text-slate-500">
                        {FormattedPrice((Number(l.product.price) || 0) * l.qty)} UZS
                      </p>
                    </div>
                    <button onClick={() => bump(l.product.id, -1)} className="size-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      <FiMinus className="text-xs" />
                    </button>
                    <span className="w-5 text-center text-sm">{l.qty}</span>
                    <button onClick={() => bump(l.product.id, 1)} className="size-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      <FiPlus className="text-xs" />
                    </button>
                    <button onClick={() => removeLine(l.product.id)} className="text-red-400 hover:text-red-600 ml-1">
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 mt-auto">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mijoz ismi" className={inputCls} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon *" className={inputCls} />
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Yetkazish manzili (ixtiyoriy)" className={inputCls} />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Izoh (ixtiyoriy)" className={inputCls} />

              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-700">Jami</span>
                <span className="font-bold text-lg text-brand-600">{FormattedPrice(totalPrice)} UZS</span>
              </div>
              <button
                onClick={submit}
                disabled={busy || !lines.length}
                className="w-full px-4 py-3 rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50"
              >
                {busy ? "Saqlanmoqda…" : "Buyurtma yaratish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualOrderModal;
