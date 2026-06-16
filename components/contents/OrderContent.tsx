"use client";
import { useOrderStore, ORDER_FETCH_LIMIT } from "@/zustand/useOrderStore";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IoIosArrowDown } from "react-icons/io";
import { FiPrinter, FiTrash2, FiPlus, FiRotateCcw } from "react-icons/fi";
import Loader from "../Loader";
import { FormattedPrice } from '@/utils'
import Image from "next/image";
import ImportExport from "../admin/ImportExport";
import ManualOrderModal from "../admin/ManualOrderModal";
import ContactButtons from "../admin/ContactButtons";
import { useRole } from "../admin/RoleContext";
import NoPhoto from "../NoPhoto";
import { Order } from "@/lib/types";
import { ordersToCSV } from "@/utils/importExport";
import { printReceipt } from "@/utils/receipt";
import { ORDER_STATUSES, OrderStatus, orderStatusMeta } from "@/lib/orderStatus";
import { isAdminPlus, isManagerPlus } from "@/lib/roles";
import { formatPhone } from "@/utils/phone";
import { startOfToday, startOfDaysAgo } from "@/lib/reports";

const OrderContent = () => {
  const { orders, fetchAllOrders, loadingOrders, updateOrderStatus, deleteOrder } = useOrderStore();
  const me = useRole();
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [showManual, setShowManual] = useState(false);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<"all" | "web" | "store">("all");
  const [range, setRange] = useState<"all" | "today" | "7" | "30">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllOrders()
  }, [fetchAllOrders]);

  // Everything EXCEPT the status tab — so the tab counts reflect the current
  // search / channel / date scope, and the tab then narrows further by status.
  const filteredBase = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from =
      range === "today" ? startOfToday() : range === "7" ? startOfDaysAgo(7) : range === "30" ? startOfDaysAgo(30) : 0;
    return orders.filter((o) => {
      if (channel !== "all" && (o.channel ?? "web") !== channel) return false;
      if (from > 0) {
        const ms = o.date?.seconds ? o.date.seconds * 1000 : 0;
        if (ms < from) return false;
      }
      if (q) {
        const hay = `${o.clientName ?? ""} ${o.clientLastName ?? ""} ${o.clientPhone ?? ""} ${o.orderNo ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, channel, range]);

  // Per-status counts within the current scope drive the tabs.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: filteredBase.length };
    for (const s of ORDER_STATUSES) c[s.key] = 0;
    for (const o of filteredBase) c[orderStatusMeta(o.status).key]++;
    return c;
  }, [filteredBase]);

  const visibleOrders = useMemo(
    () => (tab === "all" ? filteredBase : filteredBase.filter((o) => orderStatusMeta(o.status).key === tab)),
    [filteredBase, tab]
  );

  const handleStatus = async (id: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(id, status, me?.name);
      toast.success("Holat yangilandi");
    } catch {
      toast.error("Holatni yangilab boʼlmadi");
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Buyurtmani oʼchirilsinmi? Bu amalni qaytarib boʼlmaydi.")) {
      return;
    }
    try {
      await deleteOrder(id);
      toast.success("Buyurtma oʼchirildi");
    } catch {
      toast.error("Oʼchirib boʼlmadi");
    }
  };

  // Return / refund (manager+). Sets status → "qaytarildi", which puts the goods
  // back on the shelf (updateOrderStatus restocks both web + POS sales) and
  // reverses the revenue/profit (the reports reducer excludes returned orders).
  const handleReturn = async (order: Order) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Buyurtma qaytarilsinmi? Mahsulotlar omborga qaytariladi va savdo (foyda) bekor qilinadi."
      )
    ) {
      return;
    }
    try {
      await updateOrderStatus(order.id, "qaytarildi", me?.name);
      toast.success("Buyurtma qaytarildi — zaxira tiklandi");
    } catch {
      toast.error("Qaytarib boʼlmadi");
    }
  };

  // Printable slip — the shared thermal-receipt engine (utils/receipt.ts).
  // A store sale prints a "CHEK"; a web/phone order prints a "BUYURTMA" slip
  // carrying the delivery address + note for the courier.
  const printOrderSlip = (order: Order) => {
    const ok = printReceipt({
      orderNo: order.orderNo,
      dateMs: order.date?.seconds ? order.date.seconds * 1000 : Date.now(),
      customerName: `${order.clientName ?? ""} ${order.clientLastName ?? ""}`.trim() || undefined,
      customerPhone: order.clientPhone,
      items: (order.basketItems ?? []).map((it) => ({
        title: it.title,
        quantity: it.quantity ?? 1,
        price: it.price ?? 0,
        vatRate: it.vatRate,
      })),
      total: order.totalPrice,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.deliveryAddress,
      note: order.note,
      heading: order.channel === "store" ? "CHEK" : "BUYURTMA",
    });
    if (!ok) toast.error("Brauzer oynani bloklab qoʼydi — popup ruxsatini yoqing");
  };

  /* ----------------------------- bulk actions ---------------------------- */
  const toggleSelect = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allVisibleSelected = visibleOrders.length > 0 && visibleOrders.every((o) => selected.has(o.id));
  const toggleSelectAll = () =>
    setSelected(() => (allVisibleSelected ? new Set() : new Set(visibleOrders.map((o) => o.id))));
  const bulkStatus = async (status: OrderStatus) => {
    const ids = visibleOrders.filter((o) => selected.has(o.id)).map((o) => o.id);
    if (!ids.length) return;
    let ok = 0;
    for (const id of ids) {
      try { await updateOrderStatus(id, status, me?.name); ok++; } catch { /* keep going */ }
    }
    toast.success(`${ok} ta buyurtma holati yangilandi`);
    setSelected(new Set());
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold">Buyurtmalar</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-brand-500 text-white font-semibold hover:bg-brand-600"
          >
            <FiPlus className="text-base" /> Yangi buyurtma
          </button>
          {orders.length > 0 && (
            <ImportExport entityLabel="orders" onExportCSV={() => ordersToCSV(visibleOrders)} />
          )}
        </div>
      </div>

      {showManual && <ManualOrderModal onClose={() => setShowManual(false)} />}
      <div className="w-full h-0.5 bg-gray-300 my-2 rounded-full"></div>

      {orders.length >= ORDER_FETCH_LIMIT && (
        <p className="text-xs text-slate-400">
          Eng soʼnggi {ORDER_FETCH_LIMIT} ta buyurtma koʼrsatilmoqda — toʼliq tarix uchun CSV eksport qiling.
        </p>
      )}

      {/* Status filter tabs with live counts */}
      {orders.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              tab === "all"
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Hammasi <span className="opacity-70">{counts.all}</span>
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setTab(s.key)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                tab === s.key
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s.label} <span className="opacity-70">{counts[s.key]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search + channel + date filters (operate on the in-memory order list) */}
      {orders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki MH-… raqami boʼyicha qidirish"
            className="flex-1 min-w-[180px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as "all" | "web" | "store")}
            title="Sotuv kanali"
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600 outline-none focus:border-brand"
          >
            <option value="all">Barcha kanal</option>
            <option value="web">Veb</option>
            <option value="store">Doʼkon</option>
          </select>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as "all" | "today" | "7" | "30")}
            title="Davr"
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600 outline-none focus:border-brand"
          >
            <option value="all">Butun davr</option>
            <option value="today">Bugun</option>
            <option value="7">7 kun</option>
            <option value="30">30 kun</option>
          </select>
        </div>
      )}

      {/* Select-all + bulk status bar */}
      {visibleOrders.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-slate-500 mt-3 cursor-pointer w-fit">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="size-4 accent-brand-500" />
          Hammasini tanlash ({visibleOrders.length})
        </label>
      )}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mt-2 shadow-sm">
          <span className="text-sm font-semibold text-brand-700">{selected.size} tanlandi</span>
          <span className="text-sm text-slate-500">Holatga oʼtkazish:</span>
          {ORDER_STATUSES.filter((s) => s.key !== "qaytarildi").map((s) => (
            <button
              key={s.key}
              onClick={() => bulkStatus(s.key)}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-brand-200 text-brand-600 hover:bg-brand-100"
            >
              {s.label}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-sm text-slate-500 hover:underline">
            Tozalash
          </button>
        </div>
      )}

      <div className="mt-6 space-y-4 lg:px-4">
        {loadingOrders && (
          <div className="flex items-center justify-center">
            <Loader />
          </div>
        )}

        {!loadingOrders && orders.length > 0 && visibleOrders.length === 0 && (
          <p className="text-center text-slate-400 py-10">Filtrlarga mos buyurtma topilmadi.</p>
        )}

        {visibleOrders.length > 0 && visibleOrders.map((order) => (
          <div key={order.id}>
            <Disclosure>
              {({ open }) => (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 w-full px-4 py-2.5 bg-white shadow-lg rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Tanlash"
                      className="size-4 accent-brand-500 shrink-0"
                    />
                    <DisclosureButton className="flex items-center gap-4 text-left flex-1 min-w-0">
                      <div className="min-w-0">
                        <h3 className="font-medium capitalize truncate flex items-center gap-2">
                          <span className="truncate">
                            {order.clientName || order.clientLastName
                              ? `${order.clientName ?? ""} ${order.clientLastName ?? ""}`.trim()
                              : order.channel === "store"
                                ? "Doʼkon sotuvi"
                                : "Mijoz"}
                          </span>
                          {order.channel === "store" && (
                            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">
                              Doʼkon
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{formatPhone(order.clientPhone)}</p>
                        {order.orderNo && (
                          <p className="text-[11px] font-mono text-slate-400">{order.orderNo}</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 hidden md:block whitespace-nowrap">
                        {order.date?.seconds ? new Date(order.date.seconds * 1000).toLocaleString() : "—"}
                      </p>
                      <IoIosArrowDown
                        className={`text-xl transition-all duration-300 ml-auto shrink-0 ${
                          open ? "" : "-rotate-180"
                        }`}
                      />
                    </DisclosureButton>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end sm:shrink-0">
                      {orderStatusMeta(order.status).key === "qaytarildi" ? (
                        <span
                          title="Qaytarilgan buyurtma"
                          className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${orderStatusMeta(order.status).badge}`}
                        >
                          Qaytarildi
                        </span>
                      ) : (
                        <select
                          value={orderStatusMeta(order.status).key}
                          onChange={(e) => handleStatus(order.id, e.target.value as OrderStatus)}
                          onClick={(e) => e.stopPropagation()}
                          title="Buyurtma holati"
                          className={`text-xs font-semibold rounded-full border px-2.5 py-1 outline-none cursor-pointer ${orderStatusMeta(order.status).badge}`}
                        >
                          {ORDER_STATUSES.filter((s) => s.key !== "qaytarildi").map((s) => (
                            <option key={s.key} value={s.key} className="bg-white text-slate-700">
                              {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <ContactButtons phone={order.clientPhone} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          printOrderSlip(order);
                        }}
                        title="Chop etish (chek)"
                        className="inline-flex items-center justify-center size-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <FiPrinter className="text-sm" />
                      </button>
                      {isManagerPlus(me?.role) &&
                        ["yetkazildi", "sotildi"].includes(orderStatusMeta(order.status).key) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReturn(order);
                            }}
                            title="Qaytarish (refund) — zaxira tiklanadi"
                            className="inline-flex items-center justify-center size-8 rounded-full border border-orange-200 text-orange-500 hover:bg-orange-50"
                          >
                            <FiRotateCcw className="text-sm" />
                          </button>
                        )}
                      {isAdminPlus(me?.role) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          title="Buyurtmani oʼchirish"
                          className="inline-flex items-center justify-center size-8 rounded-full border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Transition
                    show={open}
                    enter="transition-all duration-300 ease-in-out"
                    enterFrom="transform opacity-0 max-h-0"
                    enterTo="transform opacity-100 max-h-96"
                    leave="transition-all duration-300 ease-in-out"
                    leaveFrom="transform opacity-100 max-h-96"
                    leaveTo="transform opacity-0 max-h-0"
                  >
                    <DisclosurePanel className="px-4 py-2 bg-gray-100">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left table-auto">
                          <thead>
                            <tr>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100 font-bold fontPara"
                              >
                                №
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100 font-bold fontPara"
                              >
                                Rasm
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md font-bold fontPara border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100"
                              >
                                Nomi
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md font-bold fontPara border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100"
                              >
                                Narx
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md font-bold fontPara border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100"
                              >
                                Soni
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md font-bold fontPara border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100"
                              >
                                Kategoriya
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.basketItems.map((item, index) => {
                              const { title, price, category, quantity, productImageUrl } =
                                item;
                              return (
                                <tr key={index}>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 ">
                                    {index + 1}.
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    <div className="flex justify-center">
                                      {productImageUrl?.[0]?.url ? (
                                        <Image width={80} height={80} className="w-20" src={productImageUrl[0].url} alt="" />
                                      ) : (
                                        <NoPhoto className="w-20 h-20 rounded" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    {title}
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    {FormattedPrice(price)} UZS
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    {quantity}
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    {category}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {(order.deliveryAddress || order.note) && (
                        <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                          {order.deliveryAddress && <p>📍 Manzil: {order.deliveryAddress}</p>}
                          {order.note && <p>📝 Izoh: {order.note}</p>}
                        </div>
                      )}
                      {order.lastChangedBy && (
                        <p className="text-xs text-slate-400 mt-2">
                          Oxirgi oʼzgarish: {order.lastChangedBy}
                        </p>
                      )}
                    </DisclosurePanel>
                  </Transition>
                </div>
              )}
            </Disclosure>
          </div>
        ))}
      </div>
    </>
  );
};

export default OrderContent;
