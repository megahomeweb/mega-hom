"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import { FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import useExpenseStore from "@/zustand/useExpenseStore";
import { useRole } from "@/components/admin/RoleContext";
import { isManagerPlus, isAdminPlus } from "@/lib/roles";
import NoAccess from "@/components/admin/NoAccess";
import { FormattedPrice } from "@/utils";
import { startOfToday, startOfDaysAgo } from "@/lib/reports";

const CATEGORIES = ["Ijara", "Maosh", "Kommunal", "Tovar", "Reklama", "Boshqa"];
type Period = "today" | "7d" | "30d" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "7d", label: "7 kun" },
  { key: "30d", label: "30 kun" },
  { key: "all", label: "Hammasi" },
];

// Xarajatlar — manager+ records business expenses; the dashboard subtracts them
// from gross profit to show true net profit. Only admin+ can delete a record.
const ExpensesPage = () => {
  const me = useRole();
  const { expenses, loading, fetchExpenses, addExpense, deleteExpense } = useExpenseStore();
  const [period, setPeriod] = useState<Period>("30d");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const from =
    period === "all"
      ? 0
      : period === "today"
        ? startOfToday()
        : startOfDaysAgo(period === "7d" ? 7 : 30);
  const visible = useMemo(
    () => expenses.filter((e) => (e.date?.seconds ? e.date.seconds * 1000 : 0) >= from),
    [expenses, from]
  );
  const total = useMemo(() => visible.reduce((a, e) => a + (Number(e.amount) || 0), 0), [visible]);

  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  const add = async () => {
    if (!title.trim()) return toast.error("Nomini kiriting");
    const amt = Number(amount) || 0;
    if (amt <= 0) return toast.error("Summani kiriting");
    setBusy(true);
    try {
      await addExpense({
        title,
        amount: amt,
        category,
        note,
        actorUid: me?.uid ?? "",
        actorName: me?.name ?? "",
      });
      toast.success("Xarajat qoʼshildi");
      setTitle("");
      setAmount("");
      setNote("");
    } catch {
      toast.error("Saqlab boʼlmadi");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Xarajat oʼchirilsinmi?")) return;
    try {
      await deleteExpense(id);
      toast.success("Oʼchirildi");
    } catch {
      toast.error("Oʼchirib boʼlmadi (faqat admin)");
    }
  };

  const input =
    "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link
        href="/admin-dashboard"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-brand-500 mb-3"
      >
        <GoArrowLeft className="text-xl" />
        <span>Admin panelga qaytish</span>
      </Link>
      <h1 className="text-xl font-bold text-brand-500 mb-4">Xarajatlar</h1>

      {/* Yangi xarajat */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-5 grid sm:grid-cols-2 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nomi (masalan: Dekabr ijarasi)" className={input} />
        <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Summa (UZS)" className={input} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Izoh (ixtiyoriy)" className={input} />
        <button
          onClick={add}
          disabled={busy}
          className="sm:col-span-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? "Saqlanmoqda…" : "Xarajat qoʼshish"}
        </button>
      </div>

      {/* Davr + jami */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                period === p.key
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-500 border-brand-100 hover:bg-brand-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          Jami: <b className="text-brand-600">{FormattedPrice(total)} UZS</b>
        </p>
      </div>

      {loading && expenses.length === 0 && (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}
      {!loading && visible.length === 0 && (
        <p className="text-center text-slate-400 py-16">Bu davrda xarajat yoʼq.</p>
      )}

      {/* Mobile cards */}
      {visible.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {visible.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-100 bg-white p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-700 truncate">{e.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{e.category}</span>
                  <span className="text-xs text-slate-400">
                    {e.date?.seconds ? new Date(e.date.seconds * 1000).toLocaleDateString() : "—"}
                  </span>
                </div>
                {e.note && <p className="text-xs text-slate-400 mt-1">{e.note}</p>}
                {e.actorName && <p className="text-[11px] text-slate-400 mt-0.5">{e.actorName}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-700">{FormattedPrice(e.amount)}</p>
                {isAdminPlus(me?.role) && (
                  <button onClick={() => remove(e.id)} className="text-red-400 hover:text-red-600 mt-1">
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      {visible.length > 0 && (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="py-2 px-3">Sana</th>
                <th className="py-2 px-3">Nomi</th>
                <th className="py-2 px-3">Turi</th>
                <th className="py-2 px-3 text-right">Summa</th>
                <th className="py-2 px-3">Kim</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {visible.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                    {e.date?.seconds ? new Date(e.date.seconds * 1000).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2 px-3">
                    {e.title}
                    {e.note && <span className="block text-xs text-slate-400">{e.note}</span>}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-700">
                    {FormattedPrice(e.amount)}
                  </td>
                  <td className="py-2 px-3 text-slate-500">{e.actorName || "—"}</td>
                  <td className="py-2 px-3">
                    {isAdminPlus(me?.role) && (
                      <button onClick={() => remove(e.id)} title="Oʼchirish" className="text-red-400 hover:text-red-600">
                        <FiTrash2 />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
