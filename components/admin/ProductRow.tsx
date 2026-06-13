"use client"
import { ProductT } from '@/lib/types';
import useProductStore from '@/zustand/useProductStore';
import { Switch } from '@headlessui/react';
import React from 'react'
import toast from 'react-hot-toast';

const cell =
  "h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ";

const ToggleSwitch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <Switch
    checked={on}
    onChange={onToggle}
    className={`${on ? "bg-brand" : "bg-gray-200"} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
  >
    <span
      className={`${on ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
    />
  </Switch>
);

// New / Best / Visible toggle cells. Each writes ONLY its own field via
// patchProduct, reading the live `item` from the onSnapshot list — so a toggle
// can never overwrite a price/title edited elsewhere with stale data (the old
// full-object write seeded from mount-time state could).
const ProductRow = ({ item }: { item: ProductT }) => {
  const { patchProduct } = useProductStore();

  const patch = async (data: Partial<ProductT>) => {
    try {
      await patchProduct(item.id, data);
    } catch {
      toast.error("Saqlab boʼlmadi");
    }
  };

  return (
    <>
      <td className={cell}>
        <ToggleSwitch on={!!item.isNew} onToggle={() => patch({ isNew: !item.isNew })} />
      </td>
      <td className={cell}>
        <ToggleSwitch on={!!item.isBest} onToggle={() => patch({ isBest: !item.isBest })} />
      </td>
      <td className={cell}>
        <ToggleSwitch on={!item.isHidden} onToggle={() => patch({ isHidden: !item.isHidden })} />
      </td>
    </>
  );
};

export default ProductRow
