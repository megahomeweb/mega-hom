"use client";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiDownload, FiUpload } from "react-icons/fi";
import { downloadTextFile } from "@/utils/importExport";

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface ImportExportProps<T> {
  /** Used for filenames + toasts, e.g. "products". */
  entityLabel: string;
  /** Returns CSV text to download. Omit to hide the export button. */
  onExportCSV?: () => string;
  /** Accept attribute for the file picker. */
  importAccept?: string;
  /** Parse uploaded file text into records. Throws on bad format. Omit to hide Import. */
  parseFile?: (text: string, filename: string) => T[];
  /** Persist parsed records. Required alongside parseFile for the Import button. */
  commitImport?: (items: T[]) => Promise<ImportResult>;
  /** Short helper text shown in the confirm dialog. */
  importHint?: string;
  disabled?: boolean;
}

const todayStamp = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function ImportExport<T>({
  entityLabel,
  onExportCSV,
  importAccept = ".csv",
  parseFile,
  commitImport,
  importHint,
  disabled,
}: ImportExportProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ items: T[]; filename: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const canImport = Boolean(parseFile && commitImport);

  const handleExportCSV = () => {
    if (!onExportCSV) return;
    try {
      downloadTextFile(`${entityLabel}-${todayStamp()}.csv`, onExportCSV(), "text/csv;charset=utf-8");
      toast.success(`${entityLabel} CSV yuklab olindi`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Eksport vaqtida xatolik");
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file || !parseFile) return;
    try {
      const text = await file.text();
      const items = parseFile(text, file.name);
      if (!items.length) {
        toast.error("Faylda maʼlumot topilmadi");
        return;
      }
      setPending({ items, filename: file.name });
    } catch (err) {
      console.error("Parse failed:", err);
      toast.error("Faylni oʼqib boʼlmadi — format notoʼgʼri");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const runImport = async () => {
    if (!pending || !commitImport) return;
    setBusy(true);
    try {
      const res = await commitImport(pending.items);
      const parts: string[] = [];
      if (res.created) parts.push(`${res.created} qoʼshildi`);
      if (res.updated) parts.push(`${res.updated} yangilandi`);
      if (res.skipped) parts.push(`${res.skipped} oʼtkazib yuborildi`);
      toast.success(`Import tugadi: ${parts.join(", ") || "oʼzgarish yoʼq"}`);
      if (res.errors.length) {
        console.warn("Import warnings:", res.errors);
        const preview = res.errors.slice(0, 3).join("\n");
        const more = res.errors.length > 3 ? `\n… yana ${res.errors.length - 3} ta` : "";
        toast(preview + more, { icon: "⚠️", duration: 7000 });
      }
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Import vaqtida xatolik");
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const exportBtn =
    "px-3 py-2 text-sm bg-white border border-pink-200 text-pink-500 rounded-lg hover:bg-pink-50 inline-flex items-center gap-1.5 disabled:opacity-50";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {onExportCSV && (
        <button type="button" disabled={disabled} onClick={handleExportCSV} className={exportBtn}>
          <FiDownload className="text-base" /> Export CSV
        </button>
      )}
      {canImport && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="px-3 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <FiUpload className="text-base" /> Import
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={importAccept}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </>
      )}

      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setPending(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-pink-600 mb-2">Importni tasdiqlang</h3>
            <p className="text-sm text-slate-600">
              <b className="break-all">{pending.filename}</b> faylida{" "}
              <b>{pending.items.length}</b> ta yozuv topildi.
            </p>
            {importHint && <p className="text-xs text-slate-500 mt-2">{importHint}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPending(null)}
                className="px-4 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={runImport}
                className="px-4 py-2 rounded-md bg-pink-500 text-white font-semibold hover:bg-pink-600 disabled:opacity-60"
              >
                {busy ? "Yuklanmoqda…" : "Import qilish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
