"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import { FiTrash2, FiPhone } from "react-icons/fi";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import useSupplierStore from "@/zustand/useSupplierStore";
import { useRole } from "@/components/admin/RoleContext";
import { isManagerPlus, isAdminPlus } from "@/lib/roles";
import NoAccess from "@/components/admin/NoAccess";

// Yetkazib beruvchilar — suppliers the shop restocks from. Linked to "Qoʼshish"
// (kirim) stock movements so each receipt records where the goods came from.
const SuppliersPage = () => {
  const me = useRole();
  const { suppliers, loading, fetchSuppliers, addSupplier, deleteSupplier } = useSupplierStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  const add = async () => {
    if (!name.trim()) return toast.error("Nomini kiriting");
    setBusy(true);
    try {
      await addSupplier({ name, phone, note });
      toast.success("Yetkazib beruvchi qoʼshildi");
      setName("");
      setPhone("");
      setNote("");
    } catch {
      toast.error("Saqlab boʼlmadi");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Yetkazib beruvchi oʼchirilsinmi?")) return;
    try {
      await deleteSupplier(id);
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
      <h1 className="text-xl font-bold text-brand-500 mb-4">Yetkazib beruvchilar</h1>

      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-5 grid sm:grid-cols-3 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nomi (firma / ombor)" className={input} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon (ixtiyoriy)" className={input} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Izoh (ixtiyoriy)" className={input} />
        <button
          onClick={add}
          disabled={busy}
          className="sm:col-span-3 px-4 py-2.5 rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? "Saqlanmoqda…" : "Yetkazib beruvchi qoʼshish"}
        </button>
      </div>

      {loading && suppliers.length === 0 && (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}
      {!loading && suppliers.length === 0 && (
        <p className="text-center text-slate-400 py-16">Hozircha yetkazib beruvchi yoʼq.</p>
      )}

      {suppliers.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {suppliers.map((s) => (
            <div key={s.id} className="border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-700 capitalize truncate">{s.name}</p>
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="text-sm text-brand-600 inline-flex items-center gap-1 mt-0.5">
                    <FiPhone className="text-xs" /> {s.phone}
                  </a>
                )}
                {s.note && <p className="text-xs text-slate-400 mt-1">{s.note}</p>}
              </div>
              {isAdminPlus(me?.role) && (
                <button onClick={() => remove(s.id)} title="Oʼchirish" className="text-red-400 hover:text-red-600 shrink-0">
                  <FiTrash2 />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
