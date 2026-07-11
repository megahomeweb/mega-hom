"use client";
import useCartProductStore from "@/zustand/useCartStore";
import React, { useState } from "react";
import Link from "next/link";
import Quantity from "../Quantity";
import { BsCartDash } from "react-icons/bs";
import SubmitModal from "../Modal";
import { FormattedPrice } from '@/utils'
import ProductImage, { firstImageUrl } from "@/components/ProductImage";

const CartProductContent = () => {
  const [open, setOpen] = useState(false);
  const { cartProducts, totalPrice, totalQuantity } = useCartProductStore();

  // Empty-cart state — the route is directly reachable, so don't render blank
  // panels + a 0 total.
  if (cartProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
        <BsCartDash className="text-5xl text-slate-300" />
        <p className="text-lg font-medium text-slate-600">Savatingiz boʼsh</p>
        <Link
          href="/"
          className="rounded-xl bg-brand hover:bg-brand-600 transition-colors text-white px-5 py-2.5 font-semibold"
        >
          Xaridni davom ettirish
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid lg:grid-cols-6 gap-6 pb-28 lg:pb-0">
        <div className="order-2 bg-white shadow-md border border-gray-300 rounded-xl p-4 sm:p-5 flex lg:col-span-4 flex-col gap-6 sm:gap-10">
          {cartProducts.map((cart) => (
            <div key={cart.id} className="flex flex-wrap gap-4 sm:gap-5 items-center">
              <div className="relative size-28 sm:size-44 overflow-hidden rounded-md shrink-0">
                <ProductImage
                  fill
                  sizes="(max-width: 640px) 112px, 176px"
                  className="absolute size-full object-cover"
                  src={firstImageUrl(cart.productImageUrl)}
                  alt={cart.title}
                />
              </div>
              <div className="flex flex-col gap-1 font-medium min-w-0">
                <h3 className="truncate">{cart.title}</h3>
                <p className="text-slate-500">{FormattedPrice(cart.price)} UZS</p>
                <p className="text-sm text-brand font-semibold">
                  {FormattedPrice(cart.price * cart.quantity)} UZS
                </p>
              </div>
              <Quantity id={cart.id} />
            </div>
          ))}
        </div>

        {/* Desktop summary card (mobile uses the sticky bar below) */}
        <div className="hidden lg:block h-fit bg-white shadow-md border border-gray-300 rounded-xl p-5 order-1 lg:order-3 lg:col-span-2 space-y-2 font-medium">
          <div className="flex items-center justify-between">
            <p className="text-slate-400">Mahsulotlar soni</p>
            <p className="text-gray-800">{totalQuantity} ta</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-slate-400">Umumiy summa</p>
            <p className="text-gray-800">{FormattedPrice(totalPrice)} UZS</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center justify-center gap-2 bg-brand transition-all ease-in-out hover:bg-brand-600 rounded-xl w-full text-white p-3 !mt-6"
          >
            <BsCartDash className="text-white text-xl" />
            <span>Adminga Yuborish</span>
          </button>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3">
        <div className="leading-tight shrink-0">
          <p className="text-[11px] text-slate-400">Umumiy ({totalQuantity} ta)</p>
          <p className="font-bold text-brand">{FormattedPrice(totalPrice)} UZS</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="ml-auto flex flex-1 items-center justify-center gap-2 bg-brand hover:bg-brand-600 transition-colors rounded-xl text-white p-3 font-semibold"
        >
          <BsCartDash className="text-white text-xl" />
          <span>Adminga Yuborish</span>
        </button>
      </div>

      {open && <SubmitModal setOpen={setOpen} />}
    </>
  );
};

export default CartProductContent;
