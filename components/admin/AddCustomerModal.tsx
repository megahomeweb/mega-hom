"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";
import useCustomerStore from "@/zustand/useCustomerStore";
import { normalizePhone } from "@/utils/phone";

// "Yangi mijoz" — manual CRM entry: Ism + Telefon (majburiy) + Email/Shahar
// (ixtiyoriy). Writes a customers/{phone} enrichment doc; the customer shows up
// in the list immediately (zero-order union in useCustomerStore) and merges with
// their order history automatically once they buy by the same phone number.
const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400";

const AddCustomerModal = ({ onClose }: { onClose: () => void }) => {
  const { customers, upsertEnrichment } = useCustomerStore();
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  // Same +998 (XX) XXX-XX-XX live formatting as checkout/sign-up.
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.startsWith("998")) value = value.slice(3);
    value = value.slice(0, 9);
    const formatted = value
      ? `+998 (${value.slice(0, 2)}) ${value.slice(2, 5)}${value.length > 5 ? "-" : ""}${value.slice(5, 7)}${value.length > 7 ? "-" : ""}${value.slice(7)}`
      : "";
    setForm((f) => ({ ...f, phone: formatted }));
  };

  const submit = async () => {
    const name = form.name.trim();
    const phone = normalizePhone(form.phone);
    const email = form.email.trim();
    const city = form.city.trim();
    if (!name) return toast.error("Mijoz ismini kiriting");
    if (!phone) return toast.error("Telefon raqamini toʼliq kiriting");
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      return toast.error("Email manzili notoʼgʼri formatda");

    setSaving(true);
    try {
      const exists = customers.some((c) => c.phone === phone);
      await upsertEnrichment(phone, {
        name,
        ...(email ? { email } : {}),
        ...(city ? { city } : {}),
      });
      toast.success(exists ? "Mavjud mijoz yangilandi" : "Mijoz qoʼshildi");
      onClose();
    } catch {
      toast.error("Saqlab boʼlmadi (ruxsat yetarli emas yoki tarmoq xatosi)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        onClick={() => !saving && onClose()}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Yangi mijoz"
        className="relative w-full max-w-sm bg-white rounded-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Yangi mijoz</h2>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            aria-label="Yopish"
            className="text-slate-400 hover:text-slate-600"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
          noValidate
        >
          <div>
            <label htmlFor="cust-name" className="block text-sm font-medium text-slate-700 mb-1">
              Ism <span className="text-red-500">*</span>
            </label>
            <input
              id="cust-name"
              type="text"
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Mijoz ismi"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="cust-phone" className="block text-sm font-medium text-slate-700 mb-1">
              Telefon <span className="text-red-500">*</span>
            </label>
            <input
              id="cust-phone"
              type="text"
              inputMode="tel"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="+998 (__) ___-__-__"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="cust-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="font-normal text-slate-400">(ixtiyoriy)</span>
            </label>
            <input
              id="cust-email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="mijoz@mail.uz"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="cust-city" className="block text-sm font-medium text-slate-700 mb-1">
              Shahar <span className="font-normal text-slate-400">(ixtiyoriy)</span>
            </label>
            <input
              id="cust-city"
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Toshkent"
              className={inputCls}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 text-white font-semibold py-2 hover:bg-brand-600 disabled:opacity-60"
            >
              {saving ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerModal;
