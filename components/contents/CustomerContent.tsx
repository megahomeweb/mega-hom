"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import Loader from "../Loader";
import ContactButtons from "../admin/ContactButtons";
import CustomerImportExport from "../admin/CustomerImportExport";
import useCustomerStore from "@/zustand/useCustomerStore";
import { FormattedPrice } from "@/utils";

type Segment = "all" | "repeat" | "new" | "nophone";
type SortKey = "recent" | "spent" | "orders" | "name";

const th =
  "h-12 px-4 lg:px-6 text-md font-bold border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100";
const td =
  "h-12 px-4 lg:px-6 text-md border-t border-l first:border-l-0 border-pink-100 text-slate-500";

const fmtDate = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString() : "—");

const CustomerContent = () => {
  const { customers, loading, fetchCustomers } = useCustomerStore();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [sort, setSort] = useState<SortKey>("recent");

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
    };
  }, [customers]);

  const visible = useMemo(() => {
    let list = customers;
    if (segment === "repeat") list = list.filter((c) => c.orderCount >= 2);
    else if (segment === "new") list = list.filter((c) => c.orderCount === 1);
    else if (segment === "nophone") list = list.filter((c) => c.phone === "no-phone");

    const q = search.trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/\D/g, "");
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (qDigits && c.phone.includes(qDigits))
      );
    }

    const sorted = [...list];
    if (sort === "recent") sorted.sort((a, b) => (b.lastOrderAt ?? 0) - (a.lastOrderAt ?? 0));
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
          ? "bg-pink-500 text-white border-pink-500"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <Link
            href="/admin-dashboard"
            className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-pink-500 mb-2"
          >
            <GoArrowLeft className="text-xl" />
            <span>Admin panelga qaytish</span>
          </Link>
          <h1 className="text-xl font-bold text-pink-500">Mijozlar</h1>
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
          </div>
        </div>
        <CustomerImportExport />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish: ism yoki telefon..."
          className="flex-1 min-w-48 sm:max-w-xs px-3 py-2 border border-pink-200 rounded-lg outline-none focus:ring-1 focus:ring-pink-300 text-slate-700 placeholder-slate-400"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-2 border border-pink-200 rounded-lg outline-none text-slate-700"
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
        {segTab("nophone", "Telefonsiz", customers.filter((c) => c.phone === "no-phone").length)}
      </div>

      {loading && customers.length === 0 && (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      )}

      {!loading && customers.length === 0 && (
        <p className="text-center text-slate-400 py-20">
          Hali mijozlar yoʼq — birinchi buyurtma kelganda mijoz shu yerda paydo boʼladi.
        </p>
      )}

      {visible.length > 0 && (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-separate border-pink-100">
            <tbody>
              <tr>
                <th className={th}>№</th>
                <th className={th}>Mijoz</th>
                <th className={th}>Telefon</th>
                <th className={th}>Buyurtmalar</th>
                <th className={th}>Jami xarid</th>
                <th className={th}>Oʼrtacha chek</th>
                <th className={th}>Oxirgi buyurtma</th>
                <th className={th}>Teglar</th>
                <th className={th}></th>
              </tr>
              {visible.map((c, i) => (
                <tr key={c.phone} className="hover:bg-pink-50/40">
                  <td className={td}>{i + 1}.</td>
                  <td className={`${td} capitalize font-medium text-slate-700`}>{c.name || "—"}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <span>{c.displayPhone}</span>
                      {c.phone !== "no-phone" && <ContactButtons phone={c.phone} />}
                    </div>
                  </td>
                  <td className={td}>{c.orderCount}</td>
                  <td className={td}>{FormattedPrice(c.totalSpent)} UZS</td>
                  <td className={td}>{FormattedPrice(c.avgTicket)} UZS</td>
                  <td className={td}>{fmtDate(c.lastOrderAt)}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-pink-100 text-pink-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={td}>
                    {c.phone !== "no-phone" && (
                      <Link
                        href={`/admin-dashboard/customers/${encodeURIComponent(c.phone)}`}
                        className="text-pink-500 hover:underline text-sm font-medium"
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
