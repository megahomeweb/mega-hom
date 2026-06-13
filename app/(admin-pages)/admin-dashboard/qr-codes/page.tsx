"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { FiPrinter } from "react-icons/fi";
import { GoArrowLeft } from "react-icons/go";
import Loader from "@/components/Loader";
import useProductStore from "@/zustand/useProductStore";
import { productUrl } from "@/lib/site";
import { FormattedPrice } from "@/utils";

// Hamma mahsulot uchun bitta chop etiladigan QR varaq: har bir kartani qirqib,
// doʼkondagi mahsulotga yopishtirish mumkin. Mijoz skaner qilsa — megahome.uz
// dagi shu mahsulot sahifasi ochiladi.
const QRCodesPage = () => {
  const { products, loading, fetchProducts } = useProductStore();
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      const entries = await Promise.all(
        products.map(async (p) => {
          // 400px + quiet-zone margin + "Q" (25%) recovery — bir varaqda 4 tadan
          // chop etilganda ham toza va ishonchli skaner qilinadi.
          const dataUrl = await QRCode.toDataURL(productUrl(p.id), {
            width: 400,
            margin: 4,
            errorCorrectionLevel: "Q",
            color: { dark: "#1e293b", light: "#ffffff" },
          });
          return [p.id, dataUrl] as const;
        })
      );
      if (!cancelled) setCodes(Object.fromEntries(entries));
    };
    if (products.length) generate().catch((err) => console.error("QR sheet failed:", err));
    return () => {
      cancelled = true;
    };
  }, [products]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* boshqaruv paneli — chop etishda koʼrinmaydi */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div>
          <Link
            href="/admin-dashboard"
            className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-pink-500 mb-2"
          >
            <GoArrowLeft className="text-xl" />
            <span>Admin panelga qaytish</span>
          </Link>
          <h1 className="text-xl font-bold text-pink-500">Mahsulot QR kodlari</h1>
          <p className="text-sm text-slate-500 mt-1">
            Varaqni chop eting, kartochkalarni qirqib mahsulotlarga yopishtiring — mijoz skaner
            qilsa saytdagi mahsulot sahifasi ochiladi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!products.length || Object.keys(codes).length < products.length}
          className="px-4 py-2 rounded-lg bg-pink-500 text-white font-semibold hover:bg-pink-600 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <FiPrinter /> Chop etish
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-20 print:hidden">
          <Loader />
        </div>
      )}

      {!loading && !products.length && (
        <p className="text-center text-slate-500 py-20 print:hidden">Mahsulotlar topilmadi.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="border border-slate-200 rounded-lg p-3 text-center break-inside-avoid bg-white"
          >
            {codes[p.id] ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL, no optimizer needed
              <img src={codes[p.id]} alt={`QR: ${p.title}`} className="w-full aspect-square" />
            ) : (
              <div className="w-full aspect-square bg-slate-50 animate-pulse rounded" />
            )}
            <p className="text-xs font-semibold text-slate-700 mt-2 line-clamp-2 min-h-8">
              {p.title}
            </p>
            <p className="text-[11px] text-slate-500">{FormattedPrice(p.price)} UZS</p>
            <p className="text-[10px] text-slate-400 mt-0.5">megahome.uz</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QRCodesPage;
