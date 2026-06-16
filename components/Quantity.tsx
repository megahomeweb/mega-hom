import useCartProductStore from "@/zustand/useCartStore";
import React from "react";
import { HiMinus } from "react-icons/hi";
import { LuPlus } from "react-icons/lu";
import { FiTrash2 } from "react-icons/fi";

const Quantity = ({ id }: { id: string }) => {
  const { incrementQuantity, decrementQuantity, removeFromBasket, getItemQuantity } =
    useCartProductStore();

  const quantityInBasket = getItemQuantity(id);

  return (
    <div className="ml-auto flex items-center gap-2">
      <div className="rounded-xl border border-gray-300 flex items-center gap-5 sm:gap-7 w-fit py-1 px-2">
        <button
          onClick={() => decrementQuantity(id)}
          disabled={quantityInBasket <= 1}
          aria-label="Kamaytirish"
          className="size-10 bg-gray-100 flex items-center justify-center rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <HiMinus className="text-black" />
        </button>
        <div className="w-8 text-center">
          <span className="block font-medium">{quantityInBasket}</span>
        </div>
        <button
          onClick={() => incrementQuantity(id)}
          aria-label="Koʼpaytirish"
          className="size-10 bg-brand text-white flex items-center justify-center rounded-full hover:bg-brand-600 transition-colors"
        >
          <LuPlus className="text-white" />
        </button>
      </div>
      <button
        onClick={() => removeFromBasket(id)}
        aria-label="Savatdan oʼchirish"
        title="Oʼchirish"
        className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:text-brand hover:bg-brand-50 transition-colors"
      >
        <FiTrash2 />
      </button>
    </div>
  );
};

export default Quantity;
