"use client";
import { FormattedPrice } from "@/utils";

// Live QQS breakdown under the product form's rate field, so whoever adds a
// product SEES what the tax does. Uzbek retail prices are VAT-INCLUSIVE: the
// entered price already contains QQS, so the tax is EXTRACTED from it
// (narx × r ÷ (100 + r)) and never added on top — changing the rate never
// changes what the customer pays, only how the chek splits the sum.
const VatExplainer = ({ price, vatRate }: { price: number; vatRate: number }) => {
  const p = Number(price) || 0;
  const r = Number(vatRate) || 0;
  const vat = r > 0 ? (p * r) / (100 + r) : 0;
  const net = p - vat;

  return (
    <div className="rounded-lg border border-brand-100 bg-white/70 px-3 py-2.5 text-xs text-slate-600 space-y-1">
      <p className="font-semibold text-slate-700">
        QQS (qoʼshilgan qiymat soligʼi) qanday hisoblanadi?
      </p>
      {r > 0 ? (
        <>
          <p>
            Sotuv narxi QQSni <b>ichiga oladi</b> — stavka narxni oshirmaydi, faqat chekda
            “shu jumladan QQS” qatorini belgilaydi.
          </p>
          {p > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1">
              <span>Narx (QQS bilan):</span>
              <span className="text-right font-medium text-slate-700">
                {FormattedPrice(Math.round(p))} soʼm
              </span>
              <span>QQSsiz qiymati:</span>
              <span className="text-right">{FormattedPrice(Math.round(net))} soʼm</span>
              <span>QQS ({r}%):</span>
              <span className="text-right">{FormattedPrice(Math.round(vat))} soʼm</span>
            </div>
          ) : (
            <p className="text-slate-400">Narxni kiriting — QQS summasi shu yerda koʼrinadi.</p>
          )}
          <p className="text-slate-400 pt-0.5">
            Formula: QQS = narx × {r} ÷ {100 + r}. Oʼzbekistonda standart stavka — 12%.
          </p>
        </>
      ) : (
        <p>
          <b>0%</b> — bu mahsulotda QQS yoʼq: chekda QQS qatori chiqmaydi (QQS toʼlovchisi
          boʼlmagan / aylanma soligʼi rejimidagi doʼkonlar uchun).
        </p>
      )}
    </div>
  );
};

export default VatExplainer;
