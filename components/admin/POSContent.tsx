"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GoArrowLeft } from "react-icons/go";
import { FiMinus, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import Loader from "../Loader";
import NoPhoto from "../NoPhoto";
import { useRole } from "./RoleContext";
import useProductStore from "@/zustand/useProductStore";
import { useOrderStore, StoreSaleItem } from "@/zustand/useOrderStore";
import { ProductT } from "@/lib/types";
import { FormattedPrice } from "@/utils";

// In-store counter (POS) — cash sales recorded into the same orders collection
// as the website (channel:"store", status:"sotildi"). Fiscal receipt + card
// payment come in a later phase; this records the sale and feeds the CRM/KPIs.
const POSContent = () => {
  const { products, loading, fetchProducts } = useProductStore();
  const { addStoreSale } = useOrderStore();
  const me = useRole();
  const [search, setSearch] = useState("");
  const [basket, setBasket] = useState<StoreSaleItem[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => !p.isHidden);
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.title ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [products, search]);

  const total = useMemo(() => basket.reduce((a, b) => a + b.price * b.quantity, 0), [basket]);
  const totalQty = useMemo(() => basket.reduce((a, b) => a + b.quantity, 0), [basket]);
  const cashNum = parseFloat(cash) || 0;
  const change = cashNum - total;

  const addToBasket = (p: ProductT) => {
    setBasket((prev) => {
      const i = prev.findIndex((b) => b.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: p.id,
          title: p.title,
          price: p.price,
          quantity: 1,
          category: p.category ?? "",
          productImageUrl: p.productImageUrl ?? [],
          // Snapshot cost + fiscal codes at sale time (profit + future ChEK).
          costAtSale: p.costPrice ?? 0,
          ikpu: p.ikpu ?? "",
          vatRate: p.vatRate ?? 0,
        },
      ];
    });
  };
  const setQty = (id: string, delta: number) =>
    setBasket((prev) =>
      prev.flatMap((b) => {
        if (b.id !== id) return [b];
        const q = b.quantity + delta;
        return q <= 0 ? [] : [{ ...b, quantity: q }];
      })
    );
  const removeLine = (id: string) => setBasket((prev) => prev.filter((b) => b.id !== id));

  // A hardware scanner types the code then Enter. On Enter, add the product
  // matched by exact barcode/id (or the single visible match).
  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const q = search.trim();
    if (!q) return;
    const exact = products.find((p) => p.barcode === q || p.id === q);
    const target = exact ?? (visible.length === 1 ? visible[0] : null);
    if (target) {
      addToBasket(target);
      setSearch("");
      searchRef.current?.focus();
    }
  };

  const pay = async () => {
    if (!basket.length) return toast.error("Savatcha boʼsh");
    if (cash && cashNum < total) return toast.error("Naqd pul yetarli emas");
    setBusy(true);
    try {
      await addStoreSale({
        basketItems: basket,
        totalPrice: total,
        totalQuantity: totalQty,
        clientName: name.trim(),
        clientLastName: "",
        clientPhone: phone.trim(),
        cashierUid: me?.uid ?? "",
        paymentMethod: "naqd",
      });
      toast.success(`Sotuv yakunlandi — ${FormattedPrice(total)} UZS`);
      setBasket([]);
      setPhone("");
      setName("");
      setCash("");
      searchRef.current?.focus();
    } catch {
      toast.error("Sotuvni saqlab boʼlmadi");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-pink-300 text-slate-700 placeholder-slate-400";

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">
      <Link
        href="/admin-dashboard"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-pink-500 mb-2"
      >
        <GoArrowLeft className="text-xl" />
        <span>Admin panel</span>
      </Link>
      <h1 className="text-xl font-bold text-pink-500 mb-4">Kassa (POS)</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        {/* LEFT: scan/search + product grid */}
        <div>
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Shtrix-kod skaner qiling yoki nomi boʼyicha qidiring…"
              className={`${inputCls} pl-9`}
            />
          </div>

          {loading && products.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader />
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-slate-400 py-16">Mahsulot topilmadi.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToBasket(p)}
                  className="border border-slate-200 rounded-lg p-2 text-left hover:border-pink-400 hover:shadow-sm transition"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded mb-1 bg-slate-50">
                    {p.productImageUrl?.[0]?.url ? (
                      <Image src={p.productImageUrl[0].url} alt={p.title} fill className="object-cover" />
                    ) : (
                      <NoPhoto className="absolute inset-0" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-700 line-clamp-2 min-h-8">{p.title}</p>
                  <p className="text-xs text-pink-600 font-bold">{FormattedPrice(p.price)} UZS</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: basket + payment */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 h-fit lg:sticky lg:top-4">
          <h2 className="font-bold text-slate-700 mb-2">Savatcha ({totalQty})</h2>

          {basket.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Mahsulotni bosing yoki shtrix-kodni skaner qiling.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {basket.map((b) => (
                <div key={b.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{b.title}</p>
                    <p className="text-xs text-slate-500">
                      {FormattedPrice(b.price)} × {b.quantity} = {FormattedPrice(b.price * b.quantity)}
                    </p>
                  </div>
                  <button onClick={() => setQty(b.id, -1)} className="size-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                    <FiMinus className="text-xs" />
                  </button>
                  <span className="w-5 text-center text-sm">{b.quantity}</span>
                  <button onClick={() => setQty(b.id, 1)} className="size-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                    <FiPlus className="text-xs" />
                  </button>
                  <button onClick={() => removeLine(b.id)} className="text-red-400 hover:text-red-600 ml-1">
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between">
            <span className="font-bold text-slate-700">Jami</span>
            <span className="font-bold text-lg text-pink-600">{FormattedPrice(total)} UZS</span>
          </div>

          <div className="space-y-2 mt-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mijoz telefoni (ixtiyoriy)"
              className={inputCls}
            />
            <input
              type="number"
              inputMode="numeric"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="Berilgan naqd pul"
              className={inputCls}
            />
            {cash !== "" && cashNum >= total && (
              <p className="text-sm text-green-600 font-medium">Qaytim: {FormattedPrice(change)} UZS</p>
            )}
          </div>

          <button
            onClick={pay}
            disabled={busy || basket.length === 0}
            className="w-full mt-3 px-4 py-3 rounded-lg bg-pink-500 text-white font-bold hover:bg-pink-600 disabled:opacity-50"
          >
            {busy ? "Saqlanmoqda…" : "Toʼlash (naqd)"}
          </button>
          <p className="text-[11px] text-slate-400 mt-2">
            Hozircha naqd sotuv qayd etiladi. Fiskal chek va karta/QR toʼlovi keyingi bosqichda
            (roʼyxatdan oʼtgan virtual kassa orqali).
          </p>
        </div>
      </div>
    </div>
  );
};

export default POSContent;
