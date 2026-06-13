"use client";
import { useOrderStore } from "@/zustand/useOrderStore";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IoIosArrowDown } from "react-icons/io";
import { FiPrinter } from "react-icons/fi";
import Loader from "../Loader";
import { FormattedPrice } from '@/utils'
import Image from "next/image";
import ImportExport from "../admin/ImportExport";
import ContactButtons from "../admin/ContactButtons";
import { useRole } from "../admin/RoleContext";
import NoPhoto from "../NoPhoto";
import { Order } from "@/lib/types";
import { ordersToCSV } from "@/utils/importExport";
import { ORDER_STATUSES, OrderStatus, orderStatusMeta } from "@/lib/orderStatus";
import { formatPhone } from "@/utils/phone";

const OrderContent = () => {
  const { orders, fetchAllOrders, loadingOrders, updateOrderStatus } = useOrderStore();
  const me = useRole();
  const [tab, setTab] = useState<"all" | OrderStatus>("all");

  useEffect(() => {
    fetchAllOrders()
  }, [fetchAllOrders]);

  // Counts per status (missing/unknown status counts as "yangi") drive the tabs.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of ORDER_STATUSES) c[s.key] = 0;
    for (const o of orders) c[orderStatusMeta(o.status).key]++;
    return c;
  }, [orders]);

  const visibleOrders = useMemo(
    () => (tab === "all" ? orders : orders.filter((o) => orderStatusMeta(o.status).key === tab)),
    [orders, tab]
  );

  const handleStatus = async (id: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(id, status, me?.name);
      toast.success("Holat yangilandi");
    } catch {
      toast.error("Holatni yangilab boʼlmadi");
    }
  };

  // Printable packing slip — built with DOM nodes (textContent escapes the
  // customer-provided values; no innerHTML on user data).
  const printOrderSlip = (order: Order) => {
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) {
      toast.error("Brauzer oynani bloklab qoʼydi — popup ruxsatini yoqing");
      return;
    }
    const d = win.document;
    d.title = `Buyurtma — ${order.clientName ?? ""}`;
    const style = d.createElement("style");
    style.textContent =
      "body{font-family:-apple-system,Arial,sans-serif;padding:20px;color:#1e293b}" +
      "h1{font-size:18px;margin:0 0 4px}.muted{color:#64748b;font-size:12px;margin:2px 0}" +
      "table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}" +
      "th,td{text-align:left;border-bottom:1px solid #e2e8f0;padding:6px 4px}" +
      ".tot{font-weight:700;font-size:15px;margin-top:12px;text-align:right}";
    d.head.appendChild(style);

    const h = d.createElement("h1");
    h.textContent = "megahome.uz — Buyurtma";
    const cust = d.createElement("p");
    cust.className = "muted";
    cust.textContent = `${order.clientName ?? ""} ${order.clientLastName ?? ""} · ${formatPhone(order.clientPhone)}`;
    const dt = d.createElement("p");
    dt.className = "muted";
    dt.textContent = order.date?.seconds ? new Date(order.date.seconds * 1000).toLocaleString() : "";
    d.body.append(h, cust, dt);

    const table = d.createElement("table");
    const headRow = d.createElement("tr");
    ["Mahsulot", "Soni", "Narx"].forEach((label) => {
      const thEl = d.createElement("th");
      thEl.textContent = label;
      headRow.appendChild(thEl);
    });
    const thead = d.createElement("thead");
    thead.appendChild(headRow);
    const tbody = d.createElement("tbody");
    (order.basketItems ?? []).forEach((it) => {
      const tr = d.createElement("tr");
      const c1 = d.createElement("td");
      c1.textContent = it.title ?? "";
      const c2 = d.createElement("td");
      c2.textContent = String(it.quantity ?? 1);
      const c3 = d.createElement("td");
      c3.textContent = `${FormattedPrice(it.price ?? 0)} UZS`;
      tr.append(c1, c2, c3);
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
    const tot = d.createElement("p");
    tot.className = "tot";
    tot.textContent = `Jami: ${FormattedPrice(order.totalPrice)} UZS`;
    d.body.append(table, tot);

    win.print();
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold capitalize">All Orders</h2>
        {orders.length > 0 && (
          <ImportExport entityLabel="orders" onExportCSV={() => ordersToCSV(orders)} />
        )}
      </div>
      <div className="w-full h-0.5 bg-gray-300 my-2 rounded-full"></div>

      {/* Status filter tabs with live counts */}
      {orders.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              tab === "all"
                ? "bg-pink-500 text-white border-pink-500"
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
                  ? "bg-pink-500 text-white border-pink-500"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s.label} <span className="opacity-70">{counts[s.key]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4 lg:px-4">
        {loadingOrders && (
          <div className="flex items-center justify-center">
            <Loader />
          </div>
        )}

        {!loadingOrders && orders.length > 0 && visibleOrders.length === 0 && (
          <p className="text-center text-slate-400 py-10">Bu holatda buyurtma yoʼq.</p>
        )}

        {visibleOrders.length > 0 && visibleOrders.map((order) => (
          <div key={order.id}>
            <Disclosure>
              {({ open }) => (
                <div>
                  <div className="flex items-center justify-between gap-3 w-full px-4 py-2 bg-white shadow-lg rounded-lg border border-gray-200">
                    <DisclosureButton className="flex items-center gap-4 text-left flex-1 min-w-0">
                      <div className="min-w-0">
                        <h3 className="font-medium capitalize truncate">{order.clientName} {order.clientLastName}</h3>
                        <p className="text-sm text-gray-500">{formatPhone(order.clientPhone)}</p>
                      </div>
                      <p className="text-sm text-gray-500 hidden md:block whitespace-nowrap">
                        {new Date(order.date.seconds * 1000).toLocaleString()}
                      </p>
                      <IoIosArrowDown
                        className={`text-xl transition-all duration-300 ml-auto shrink-0 ${
                          open ? "" : "-rotate-180"
                        }`}
                      />
                    </DisclosureButton>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={orderStatusMeta(order.status).key}
                        onChange={(e) => handleStatus(order.id, e.target.value as OrderStatus)}
                        onClick={(e) => e.stopPropagation()}
                        title="Buyurtma holati"
                        className={`text-xs font-semibold rounded-full border px-2.5 py-1 outline-none cursor-pointer ${orderStatusMeta(order.status).badge}`}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s.key} value={s.key} className="bg-white text-slate-700">
                            {s.label}
                          </option>
                        ))}
                      </select>
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
                                className="h-12 px-6 text-md border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100 font-bold fontPara"
                              >
                                S.No.
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100 font-bold fontPara"
                              >
                                Image
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100"
                              >
                                Title
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100"
                              >
                                Price
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100"
                              >
                                soni
                              </th>
                              <th
                                scope="col"
                                className="h-12 px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100"
                              >
                                Category
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.basketItems.map((item, index) => {
                              const { title, price, category, quantity, productImageUrl } =
                                item;
                              return (
                                <tr key={index} className="text-pink-300">
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 ">
                                    {index + 1}.
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    <div className="flex justify-center">
                                      {productImageUrl?.[0]?.url ? (
                                        <Image width={80} height={80} className="w-20" src={productImageUrl[0].url} alt="" />
                                      ) : (
                                        <NoPhoto className="w-20 h-20 rounded" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    {title}
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    {FormattedPrice(price)} UZS
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    {quantity}
                                  </td>
                                  <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                                    {category}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
