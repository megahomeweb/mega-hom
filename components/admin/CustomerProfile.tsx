"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import { FiX, FiPlus } from "react-icons/fi";
import toast from "react-hot-toast";
import Loader from "../Loader";
import ContactButtons from "./ContactButtons";
import ManualOrderModal from "./ManualOrderModal";
import useCustomerStore from "@/zustand/useCustomerStore";
import { FormattedPrice } from "@/utils";

const kpi = "rounded-xl border border-brand-100 bg-brand-50 px-4 py-3";

const CustomerProfile = ({ phone }: { phone: string }) => {
  const { customers, loading, fetchCustomers, upsertEnrichment } = useCustomerStore();
  const [tagInput, setTagInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [city, setCity] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showSell, setShowSell] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const customer = customers.find((c) => c.phone === phone);

  useEffect(() => {
    if (customer && !hydrated) {
      setName(customer.name ?? "");
      setEmail(customer.email ?? "");
      setNote(customer.note ?? "");
      setCity(customer.city ?? "");
      setHydrated(true);
    }
  }, [customer, hydrated]);

  if (loading && !customer) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-slate-500 mb-4">Mijoz topilmadi.</p>
        <Link href="/admin-dashboard/customers" className="text-brand-500 hover:underline">
          ← Mijozlar roʼyxati
        </Link>
      </div>
    );
  }

  const save = async (patch: {
    tags?: string[];
    note?: string;
    city?: string;
    name?: string;
    email?: string;
  }) => {
    try {
      await upsertEnrichment(customer.phone, patch);
      toast.success("Saqlandi");
    } catch {
      toast.error("Saqlab boʼlmadi");
    }
  };
  const addTag = async () => {
    const t = tagInput.trim();
    setTagInput("");
    if (!t || customer.tags.includes(t)) return;
    await save({ tags: [...customer.tags, t] });
  };
  const removeTag = (t: string) => save({ tags: customer.tags.filter((x) => x !== t) });
  const saveNote = async () => {
    const cleanEmail = email.trim();
    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error("Email manzili notoʼgʼri formatda");
      return;
    }
    setSavingNote(true);
    await save({ note, city, name: name.trim(), email: cleanEmail });
    setSavingNote(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link
        href="/admin-dashboard/customers"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-brand-500 mb-4"
      >
        <GoArrowLeft className="text-xl" />
        <span>Mijozlar roʼyxati</span>
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-5 flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 capitalize">{customer.name || "Mijoz"}</h1>
          <p className="text-slate-600 mt-1">{customer.displayPhone}</p>
          {customer.email && <p className="text-sm text-slate-500 mt-0.5">{customer.email}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSell(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-brand-500 text-white font-semibold hover:bg-brand-600"
          >
            <FiPlus className="text-base" /> Yana sotish
          </button>
          {customer.phone !== "no-phone" && <ContactButtons phone={customer.phone} />}
        </div>
      </div>

      {showSell && (
        <ManualOrderModal
          onClose={() => setShowSell(false)}
          prefill={{
            name: customer.name,
            phone: customer.phone === "no-phone" ? "" : customer.displayPhone,
          }}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className={kpi}>
          <p className="text-xs text-slate-500">Jami xarid</p>
          <p className="text-lg font-bold text-slate-700">{FormattedPrice(customer.totalSpent)} UZS</p>
        </div>
        <div className={kpi}>
          <p className="text-xs text-slate-500">Buyurtmalar</p>
          <p className="text-lg font-bold text-slate-700">{customer.orderCount}</p>
        </div>
        <div className={kpi}>
          <p className="text-xs text-slate-500">Oʼrtacha chek</p>
          <p className="text-lg font-bold text-slate-700">{FormattedPrice(customer.avgTicket)} UZS</p>
        </div>
        <div className={kpi}>
          <p className="text-xs text-slate-500">Oxirgi buyurtma</p>
          <p className="text-lg font-bold text-slate-700">
            {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : "—"}
          </p>
        </div>
      </div>

      {/* Tags + contact details + note */}
      <div className="rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-700 mb-3">Mijoz maʼlumotlari</h2>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {customer.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full bg-brand-100 text-brand-600">
              {t}
              <button onClick={() => removeTag(t)} title="Olib tashlash">
                <FiX className="text-xs" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Belgi qoʼshish..."
            className="px-2.5 py-1 text-sm border border-brand-200 rounded-full outline-none focus:ring-1 focus:ring-brand-300"
          />
          <button onClick={addTag} className="text-sm text-brand-500 hover:underline">
            Qoʼshish
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ism"
            aria-label="Mijoz ismi"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-700"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            placeholder="Email (ixtiyoriy)"
            aria-label="Mijoz emaili"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-700"
          />
        </div>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Shahar"
          className="w-full sm:max-w-xs px-3 py-2 border border-slate-200 rounded-lg outline-none mb-3 text-slate-700"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Ichki izoh — mijozga koʼrinmaydi"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-700"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={saveNote}
            disabled={savingNote}
            className="px-4 py-2 rounded-md bg-brand-500 text-white font-semibold hover:bg-brand-600 disabled:opacity-60"
          >
            {savingNote ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>

      {/* Order history */}
      <h2 className="font-semibold text-slate-700 mb-3">Buyurtmalar tarixi ({customer.orders.length})</h2>
      <div className="space-y-3">
        {customer.orders.map((o) => (
          <div key={o.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-sm text-slate-500">
                {o.date?.seconds ? new Date(o.date.seconds * 1000).toLocaleString() : ""}
              </span>
              <span className="font-bold text-brand-600">{FormattedPrice(o.totalPrice)} UZS</span>
            </div>
            <ul className="text-sm text-slate-600 space-y-0.5">
              {(o.basketItems ?? []).map((it, idx) => (
                <li key={idx} className="capitalize">
                  • {it.title} × {it.quantity ?? 1}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerProfile;
