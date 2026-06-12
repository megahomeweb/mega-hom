"use client";
import { useOrderStore } from "@/zustand/useOrderStore";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import React, { useEffect } from "react";
import { IoIosArrowDown } from "react-icons/io";
import Loader from "../Loader";
import { FormattedPrice } from '@/utils'
import Image from "next/image";
import ImportExport from "../admin/ImportExport";
import NoPhoto from "../NoPhoto";
import { ordersToCSV } from "@/utils/importExport";

const OrderContent = () => {
  const { orders, fetchAllOrders, loadingOrders } = useOrderStore();

  useEffect(() => {
    fetchAllOrders()
  }, [fetchAllOrders]);

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold capitalize">All Orders</h2>
        {orders.length > 0 && (
          <ImportExport entityLabel="orders" onExportCSV={() => ordersToCSV(orders)} />
        )}
      </div>
      <div className="w-full h-0.5 bg-gray-300 my-2 rounded-full"></div>
      <div className="mt-10 space-y-4 lg:px-4">
        {loadingOrders && (
          <div className="flex items-center justify-center">
            <Loader />
          </div>
        )}

        {orders.length > 0 && orders.map((order) => (
          <div key={order.id}>
            <Disclosure>
              {({ open }) => (
                <div>
                  <DisclosureButton className="flex items-center justify-between w-full px-4 py-2 text-left bg-white shadow-lg rounded-lg border border-gray-200">
                    <div className="flex items-end gap-4">
                      <div>
                        <h3 className="font-medium capitalize">{order.clientName} {order.clientLastName}</h3>
                        <p className="text-sm text-gray-500">{order.clientPhone}</p>
                      </div>
                      <p className="text-sm text-gray-500">Sana Vaqt: {new Date(order.date.seconds * 1000).toLocaleString()}</p> 
                    </div>
                    <IoIosArrowDown
                      className={`text-xl transition-all duration-300 ${
                        open ? "" : "-rotate-180"
                      }`}
                    />
                  </DisclosureButton>
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
