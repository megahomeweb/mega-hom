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
import { FiPrinter, FiTrash2, FiPlus } from "react-icons/fi";
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
import { isAdminPlus } from "@/lib/roles";
import { formatPhone } from "@/utils/phone";

const OrderContent = () => {
  const { orders, fetchAllOrders, loadingOrders, updateOrderStatus, deleteOrder } = useOrderStore();
  const me = useRole();
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [showManual, setShowManual] = useState(false);

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

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold capitalize">All Orders</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-pink-500 text-white font-semibold hover:bg-pink-600"
          >
            <FiPlus className="text-base" /> Yangi buyurtma
          </button>
          {orders.length > 0 && (
            <ImportExport entityLabel="orders" onExportCSV={() => ordersToCSV(orders)} />
          )}
        </div>
      </div>

      {showManual && <ManualOrderModal onClose={() => setShowManual(false)} />}
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
