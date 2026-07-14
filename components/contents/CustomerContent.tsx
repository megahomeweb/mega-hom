"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import Loader from "../Loader";
import ContactButtons from "../admin/ContactButtons";
import CustomerImportExport from "../admin/CustomerImportExport";
import AddCustomerModal from "../admin/AddCustomerModal";
import { useRole } from "../admin/RoleContext";
import useCustomerStore from "@/zustand/useCustomerStore";
import { isManagerPlus } from "@/lib/roles";
import { FormattedPrice } from "@/utils";
import { CustomerT } from "@/lib/types";
import { FiPlus } from "react-icons/fi";

type Segment = "all" | "repeat" | "new" | "registered" | "nophone";
type SortKey = "recent" | "spent" | "orders" | "name";

// Profile pages are phone-keyed; the shared "no-phone" bucket and phoneless
// registered accounts (user:<uid>) have no meaningful profile to open.
const canOpenProfile = (c: CustomerT) =>
  c.phone !== "no-phone" && !c.phone.startsWith("user:");

const RegisteredBadge = () => (
  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">
    Roʼyxatdan oʼtgan
  </span>
);

const th =
  "h-12 px-4 lg:px-6 text-md font-bold border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100";
const td =
  "h-12 px-4 lg:px-6 text-md border-t border-l first:border-l-0 border-brand-100 text-slate-500";

const fmtDate = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString() : "—");

const CustomerContent = () => {
  const { customers, loading, fetchCustomers } = useCustomerStore();
  const me = useRole();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const stats = useMemo(() => {
    const d = new Date();
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    return {
      total: customers.length,
      repeat: customers.filter((c) => c.orderCount >= 2).length,
      newThisMonth: customers.filter((c) => c.firstOrderAt && c.firstOrderAt >= monthStart).length,
      registered: customers.filter((c) => c.registered).length,
    };
  }, [customers]);

  const visible = useMemo(() => {
    let list = customers;
    if (segment === "repeat") list = list.filter((c) => c.orderCount >= 2);
    else if (segment === "new") list = list.filter((c) => c.orderCount === 1);
    else if (segment === "registered") list = list.filter((c) => c.registered);
    else if (segment === "nophone") list = list.filter((c) => c.phone === "no-phone");

    const q = search.trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/\D/g, "");
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (qDigits && c.phone.includes(qDigits))
      );
    }

    const sorted = [...list];
    if (sort === "recent")
      sorted.sort(
        (a, b) => (b.lastOrderAt ?? b.registeredAt ?? 0) - (a.lastOrderAt ?? a.registeredAt ?? 0)
      );
    else if (sort === "spent") sorted.sort((a, b) => b.totalSpent - a.totalSpent);
    else if (sort === "orders") sorted.sort((a, b) => b.orderCount - a.orderCount);
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [customers, segment, search, sort]);

  const segTab = (key: Segment, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setSegment(key)}
      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
        segment === key
          ? "bg-brand-500 text-white border-brand-500"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );

  if (!isManagerPlus(me?.role)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">
        Bu sahifa faqat menejer va administratorlar uchun.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <Link
            href="/admin-dashboard"
            className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-brand-500 mb-2"
          >
            <GoArrowLeft className="text-xl" />
            <span>Admin panelga qaytish</span>
          </Link>
          <h1 className="text-xl font-bold text-brand-500">Mijozlar</h1>
          <div className="flex flex-wrap gap-2 mt-2 text-sm">
            <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
              Jami: {stats.total}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              Takroriy: {stats.repeat}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Bu oy yangi: {stats.newThisMonth}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Roʼyxatdan oʼtgan: {stats.registered}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-brand-500 text-white font-semibold hover:bg-brand-600"
          >
            <FiPlus className="text-base" /> Yangi mijoz
          </button>
          <CustomerImportExport />
        </div>
      </div>

      {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish: ism yoki telefon..."
          className="flex-1 min-w-48 sm:max-w-xs px-3 py-2 border border-brand-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-2 border border-brand-200 rounded-lg outline-none text-slate-700"
        >
          <option value="recent">Oxirgi buyurtma</option>
          <option value="spent">Eng koʼp xarid</option>
          <option value="orders">Buyurtmalar soni</option>
          <option value="name">Ism (A→Z)</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {segTab("all", "Hammasi", customers.length)}
        {segTab("repeat", "Takroriy", stats.repeat)}
        {segTab("new", "Yangi (1 buyurtma)", customers.filter((c) => c.orderCount === 1).length)}
        {segTab("registered", "Roʼyxatdan oʼtgan", stats.registered)}
        {segTab("nophone", "Telefonsiz", customers.filter((c) => c.phone === "no-phone").length)}
      </div>

      {loading && customers.length === 0 && (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      )}

      {!loading && customers.length === 0 && (
        <p className="text-center text-slate-400 py-20">
          Hali mijozlar yoʼq — buyurtma kelganda yoki saytdan roʼyxatdan oʼtilganda mijoz shu
          yerda paydo boʼladi. “Yangi mijoz” tugmasi bilan qoʼlda ham qoʼshishingiz mumkin.
        </p>
      )}

      {/* ---------- Mobile cards (lg:hidden) ---------- */}
      {visible.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {visible.map((c) => (
            <div key={c.phone} className="rounded-xl border border-brand-100 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700 capitalize truncate">
                    {c.name || "Mijoz"} {c.registered && <RegisteredBadge />}
                  </p>
                  <p className="text-sm text-slate-500">{c.displayPhone}</p>
                  {c.email && <p className="text-xs text-slate-400 truncate">{c.email}</p>}
                </div>
                {c.phone !== "no-phone" && !c.phone.startsWith("user:") && (
                  <ContactButtons phone={c.phone} />
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                <span>Buyurtma: <b className="text-slate-700">{c.orderCount}</b></span>
                <span>Xarid: <b className="text-brand-600">{FormattedPrice(c.totalSpent)}</b></span>
                <span>Oʼrtacha: {FormattedPrice(c.avgTicket)}</span>
                <span>Oxirgi: {fmtDate(c.lastOrderAt)}</span>
              </div>
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-brand-100 text-brand-600">{t}</span>
                  ))}
                </div>
              )}
              {canOpenProfile(c) && (
                <Link
                  href={`/admin-dashboard/customers/${encodeURIComponent(c.phone)}`}
                  className="inline-block mt-2 text-sm font-medium text-brand-500 hover:underline"
                >
                  Profilni koʼrish →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---------- Desktop table (lg+) ---------- */}
      {visible.length > 0 && (
        <div className="hidden lg:block w-full overflow-x-auto">
          <table className="w-full text-left border-separate border-brand-100">
            <tbody>
              <tr>
                <th className={th}>№</th>
                <th className={th}>Mijoz</th>
                <th className={th}>Telefon</th>
                <th className={th}>Email</th>
                <th className={th}>Buyurtmalar</th>
                <th className={th}>Jami xarid</th>
                <th className={th}>Oʼrtacha chek</th>
                <th className={th}>Oxirgi buyurtma</th>
                <th className={th}>Belgilar</th>
                <th className={th}></th>
              </tr>
              {visible.map((c, i) => (
                <tr key={c.phone} className="hover:bg-brand-50/40">
                  <td className={td}>{i + 1}.</td>
                  <td className={`${td} capitalize font-medium text-slate-700`}>
                    <span className="inline-flex items-center gap-1.5">
                      {c.name || "—"} {c.registered && <RegisteredBadge />}
                    </span>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <span>{c.displayPhone}</span>
                      {c.phone !== "no-phone" && !c.phone.startsWith("user:") && (
                        <ContactButtons phone={c.phone} />
                      )}
                    </div>
                  </td>
                  <td className={`${td} lowercase`}>{c.email || "—"}</td>
                  <td className={td}>{c.orderCount}</td>
                  <td className={td}>{FormattedPrice(c.totalSpent)} UZS</td>
                  <td className={td}>{FormattedPrice(c.avgTicket)} UZS</td>
                  <td className={td}>{fmtDate(c.lastOrderAt)}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-brand-100 text-brand-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={td}>
                    {canOpenProfile(c) && (
                      <Link
                        href={`/admin-dashboard/customers/${encodeURIComponent(c.phone)}`}
                        className="text-brand-500 hover:underline text-sm font-medium"
                      >
                        Profil
                      </Link>
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

export default CustomerContent;
