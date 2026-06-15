"use client";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiCheckCircle, FiDownload, FiUpload } from "react-icons/fi";
import { ColumnOption, ImportPlan, downloadTextFile } from "@/utils/importExport";

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
  /** Which editable columns the file contains — rendered as on/off toggles. */
  detectColumns?: (items: T[]) => ColumnOption[];
  /** Dry-run counts for the live preview ("X new, Y updated, Z skipped"). */
  planImport?: (items: T[], enabled: Set<string>) => ImportPlan;
  /** Persist parsed records. Receives the user's enabled-column selection. */
  commitImport?: (items: T[], enabled: Set<string>) => Promise<ImportResult>;
  /** Short helper text shown in the confirm dialog. */
  importHint?: string;
  disabled?: boolean;
}

const todayStamp = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** .xlsx/.xls → CSV text via SheetJS (loaded on demand); anything else → raw text. */
async function fileToText(file: File): Promise<{ text: string; filename: string }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { text: "", filename: file.name + ".csv" };
    return { text: XLSX.utils.sheet_to_csv(sheet), filename: file.name + ".csv" };
  }
  return { text: await file.text(), filename: file.name };
}

export default function ImportExport<T>({
  entityLabel,
  onExportCSV,
  importAccept = ".csv,.xlsx,.xls,.json",
  parseFile,
  detectColumns,
  planImport,
  commitImport,
  importHint,
  disabled,
}: ImportExportProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{
    items: T[];
    filename: string;
    columns: ColumnOption[];
  } | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const canImport = Boolean(parseFile && commitImport);

  const plan = useMemo<ImportPlan | null>(
    () => (pending && planImport ? planImport(pending.items, enabled) : null),
    [pending, planImport, enabled]
  );

  const closeDialog = () => {
    setPending(null);
    setResult(null);
  };

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
      const { text, filename } = await fileToText(file);
      const items = parseFile(text, filename);
      if (!items.length) {
        toast.error("Faylda maʼlumot topilmadi");
        return;
      }
      const columns = detectColumns ? detectColumns(items) : [];
      setEnabled(new Set(columns.filter((c) => c.count > 0).map((c) => c.key)));
      setResult(null);
      setPending({ items, filename: file.name, columns });
    } catch (err) {
      console.error("Parse failed:", err);
      toast.error("Faylni oʼqib boʼlmadi — format notoʼgʼri");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const toggleColumn = (key: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const runImport = async () => {
    if (!pending || !commitImport) return;
    setBusy(true);
    try {
      const res = await commitImport(pending.items, enabled);
      setResult(res);
      toast.success("Import tugadi");
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Import vaqtida xatolik — internet yoki ruxsatni tekshiring");
    } finally {
      setBusy(false);
    }
  };

  const downloadErrorReport = () => {
    if (!result) return;
    const report = [
      `Import hisoboti — ${pending?.filename ?? entityLabel} (${todayStamp()})`,
      `Qoʼshildi: ${result.created}, Yangilandi: ${result.updated}, Oʼtkazib yuborildi: ${result.skipped}`,
      "",
      ...result.errors,
    ].join("\r\n");
    downloadTextFile(`import-hisobot-${todayStamp()}.txt`, report);
  };

  const exportBtn =
    "px-3 py-2 text-sm bg-white border border-brand-200 text-brand-500 rounded-lg hover:bg-brand-50 inline-flex items-center gap-1.5 disabled:opacity-50";

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
            className="px-3 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 inline-flex items-center gap-1.5 disabled:opacity-50"
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
          onClick={() => !busy && closeDialog()}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {result ? (
              /* ------------------------------ natija ------------------------------ */
              <>
                <h3 className="text-lg font-bold text-brand-600 mb-3 flex items-center gap-2">
                  <FiCheckCircle className="text-green-500" /> Import yakunlandi
                </h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    {result.created} ta qoʼshildi
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {result.updated} ta yangilandi
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                    {result.skipped} ta oʼtkazib yuborildi
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-amber-600 mb-1.5">
                      Izohlar ({result.errors.length}):
                    </p>
                    <ul className="max-h-44 overflow-y-auto space-y-1 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      {result.errors.map((e, i) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={downloadErrorReport}
                      className="mt-2 text-xs text-brand-500 hover:text-brand-600 underline"
                    >
                      Hisobotni yuklab olish (.txt)
                    </button>
                  </div>
                )}
                <div className="flex justify-end mt-5">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="px-4 py-2 rounded-md bg-brand-500 text-white font-semibold hover:bg-brand-600"
                  >
                    Yopish
                  </button>
                </div>
              </>
            ) : (
              /* ----------------------------- sozlash ------------------------------ */
              <>
                <h3 className="text-lg font-bold text-brand-600 mb-2">Importni sozlash</h3>
                <p className="text-sm text-slate-600">
                  <b className="break-all">{pending.filename}</b> faylida{" "}
                  <b>{pending.items.length}</b> ta qator topildi.
                </p>

                {plan && (
                  <div className="flex flex-wrap gap-2 text-sm mt-3">
                    <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                      + {plan.create} yangi
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      ~ {plan.update} yangilanadi
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                      {plan.skip} oʼtkazib yuboriladi
                    </span>
                  </div>
                )}

                {pending.columns.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Qaysi ustunlar yozilsin?
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {pending.columns.map((col) => {
                        const absent = col.count === 0;
                        return (
                          <label
                            key={col.key}
                            className={`flex items-center gap-2 text-sm select-none ${
                              absent ? "text-slate-300 cursor-not-allowed" : "text-slate-700 cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={absent || busy}
                              checked={enabled.has(col.key)}
                              onChange={() => toggleColumn(col.key)}
                              className="size-4 accent-brand-500"
                            />
                            <span>
                              {col.label}
                              {!absent && <span className="text-slate-400"> ({col.count})</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Belgilanmagan ustunlar va boʼsh kataklar mavjud maʼlumotni oʼzgartirmaydi.
                    </p>
                  </div>
                )}

                {importHint && <p className="text-xs text-slate-500 mt-3">{importHint}</p>}

                {plan !== null && plan.create + plan.update === 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
                    Hozircha import qilinadigan qator yoʼq. Kamida bitta ustun
                    (masalan, <b>Nomi</b>) belgilangan va toʼldirilganini tekshiring —
                    keyin “Import qilish”ni bossangiz, sabablari koʼrsatiladi.
                  </p>
                )}

                <div className="flex justify-end gap-2 mt-5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={closeDialog}
                    className="px-4 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={runImport}
                    className="px-4 py-2 rounded-md bg-brand-500 text-white font-semibold hover:bg-brand-600 disabled:opacity-60"
                  >
                    {busy ? "Yuklanmoqda…" : "Import qilish"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
