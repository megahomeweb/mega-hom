"use client";
import { useState } from "react";
import { FiHelpCircle } from "react-icons/fi";

// Collapsible "how are these numbers computed" card for the dashboard KPIs and
// the analytics page — the formulas mirror lib/reports.ts EXACTLY, so what the
// admin reads here is what the code does.
const ROWS: { label: string; formula: string; note: string }[] = [
  {
    label: "Savdo (tushum)",
    formula: "barcha amalga oshgan buyurtmalar summasi",
    note: "Bekor qilingan va qaytarilgan buyurtmalar QOʼSHILMAYDI. Narxlar QQSni ichiga oladi.",
  },
  {
    label: "Tan narx (COGS)",
    formula: "har bir sotilgan dona × oʼsha paytdagi tan narxi",
    note: "Tan narx sotuv PAYTIDA yozib olinadi — keyin mahsulot narxini oʼzgartirsangiz eski hisobotlar buzilmaydi. Tan narxi kiritilmagan mahsulot 0 deb olinadi (foyda kamroq koʼrinadi, hech qachon oshib ketmaydi).",
  },
  {
    label: "Yalpi foyda",
    formula: "Savdo − Tan narx",
    note: "Faqat mahsulotdan olingan ustama. Ijara, maosh kabi xarajatlar bu yerda hisobga olinmaydi.",
  },
  {
    label: "Xarajat",
    formula: "davr ichidagi barcha chiqimlar (Xarajatlar boʼlimidan)",
    note: "Ijara, maosh, kommunal, reklama va boshqalar — oʼzingiz kiritgan yozuvlar.",
  },
  {
    label: "Sof (Net) foyda",
    formula: "Yalpi foyda − Xarajat",
    note: "Doʼkon haqiqatda qancha ishlaganini koʼrsatadi. QQS toʼlovchisi boʼlsangiz, byudjetga toʼlanadigan QQS ham bundan chiqadi (pastdagi QQS qatoriga qarang).",
  },
  {
    label: "shu jumladan QQS",
    formula: "har bir sotuvdagi narx × stavka ÷ (100 + stavka)",
    note: "Savdo ichida \"oʼtirgan\" qoʼshilgan qiymat soligʼi (12% da: summa × 12 ÷ 112). Chegirma berilganda QQS ham mutanosib kamayadi. Bu davlatga toʼlanadigan taxminiy QQS majburiyati.",
  },
];

const ReportsExplainer = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <FiHelpCircle className="text-brand-500 text-base" />
          Bu raqamlar qanday hisoblanadi?
        </span>
        <span className="text-xs text-slate-400">{open ? "Yashirish ▲" : "Koʼrsatish ▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {ROWS.map((r) => (
            <div key={r.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">
                {r.label} <span className="font-normal text-slate-400">= {r.formula}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{r.note}</p>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">
            Misol: 112 000 soʼmlik mahsulot (tan narxi 80 000, QQS 12%) sotilsa — Savdo 112 000,
            Yalpi foyda 32 000, shu jumladan QQS 12 000. 10 000 chegirma bilan sotilsa — Savdo
            102 000, Yalpi foyda 22 000, QQS 10 929.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsExplainer;
