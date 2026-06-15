"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { FiDownload, FiPrinter } from "react-icons/fi";
import { ProductT } from "@/lib/types";
import { productUrl } from "@/lib/site";

// Mijoz telefonida skaner qilganda toʼgʼridan-toʼgʼri megahome.uz dagi mahsulot
// sahifasiga oʼtadi. Chop etish (sticker) uchun sifatli sozlamalar:
//  - 800px PNG → ~6-7 sm stikerда ham toza (300 DPI)
//  - errorCorrectionLevel "H" (30%) → stiker yirtilsa/iflos boʼlsa ham oʼqiydi
//  - margin 4 → QR standartidagi "quiet zone", ishonchli skaner uchun shart
const QR_PIXELS = 800;
const QR_OPTS = {
  width: QR_PIXELS,
  margin: 4,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#1e293b", light: "#ffffff" },
};

interface ProductQRCodeProps {
  product: ProductT;
  onClose: () => void;
}

const ProductQRCode = ({ product, onClose }: ProductQRCodeProps) => {
  const [dataUrl, setDataUrl] = useState<string>("");
  const url = productUrl(product.id);

  useEffect(() => {
    QRCode.toDataURL(url, QR_OPTS)
      .then(setDataUrl)
      .catch((err) => {
        console.error("QR generation failed:", err);
        toast.error("QR kod yaratib boʼlmadi");
      });
  }, [url]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `megahome-qr-${product.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) {
      toast.error("Brauzer oynani bloklab qoʼydi — popup ruxsatini yoqing");
      return;
    }
    const doc = win.document;
    doc.title = `QR — ${product.title}`;
    const style = doc.createElement("style");
    style.textContent =
      "body{font-family:-apple-system,Arial,sans-serif;text-align:center;padding:24px}" +
      "img{width:280px;height:280px}h2{font-size:16px;margin:8px 0 2px}" +
      "p{font-size:12px;color:#475569;margin:2px 0}";
    doc.head.appendChild(style);

    const img = doc.createElement("img");
    img.src = dataUrl;
    img.alt = "QR";
    const heading = doc.createElement("h2");
    heading.textContent = product.title;
    const caption = doc.createElement("p");
    caption.textContent = "megahome.uz";
    doc.body.append(img, heading, caption);

    if (img.complete) setTimeout(() => win.print(), 50);
    else img.onload = () => win.print();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-brand-600 mb-1">Mahsulot QR kodi</h3>
        <p className="text-sm text-slate-700 font-medium line-clamp-2">{product.title}</p>

        <div className="flex justify-center my-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL, no optimizer needed
            <img src={dataUrl} alt={`QR: ${product.title}`} className="w-56 h-56 border border-slate-200 rounded-lg" />
          ) : (
            <div className="w-56 h-56 border border-slate-200 rounded-lg animate-pulse bg-slate-50" />
          )}
        </div>

        <p className="text-xs text-slate-500 break-all">{url}</p>
        <p className="text-[11px] text-slate-400 mt-1">ID: {product.id}</p>
        <p className="text-xs text-slate-500 mt-2">
          Mijoz QR ni skaner qilsa, saytdagi shu mahsulot sahifasiga oʼtadi.
        </p>

        <div className="flex justify-center gap-2 mt-5 flex-wrap">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl}
            className="px-4 py-2 rounded-md bg-brand-500 text-white font-semibold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center gap-1.5 text-sm"
          >
            <FiDownload /> PNG yuklab olish
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!dataUrl}
            className="px-4 py-2 rounded-md border border-brand-200 text-brand-500 hover:bg-brand-50 disabled:opacity-50 inline-flex items-center gap-1.5 text-sm"
          >
            <FiPrinter /> Chop etish
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductQRCode;
