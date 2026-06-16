"use client"
import Loader from '@/components/Loader'
import { FormattedPrice } from '@/utils'
import useCartProductStore from '@/zustand/useCartStore'
import useProductStore from '@/zustand/useProductStore'
import Image from 'next/image'
import Link from 'next/link'
import NoPhoto from '@/components/NoPhoto'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BsCartDash } from 'react-icons/bs'
import { GoArrowLeft } from 'react-icons/go'

const ProductContent = ({productID}: {productID:string}) => {
  const { fetchSingleProduct, loading, product } = useProductStore();
  const { addToBasket, getItemQuantity, load } = useCartProductStore();
  const [quantity, setQuantity] = useState(1);

  // Fetch only when the id changes (NOT on every cart change — that re-fetched
  // the product on each add-to-cart).
  useEffect(() => {
    if (productID) fetchSingleProduct(productID);
  }, [fetchSingleProduct, productID]);

  // Seed the stepper from whatever is already in the cart for this product.
  useEffect(() => {
    const inCart = getItemQuantity(productID);
    if (inCart > 0) setQuantity(inCart);
  }, [productID, getItemQuantity]);

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader />
      </div>
    );
  }

  const stock = Number(product.quantity) || 0;
  const outOfStock = stock <= 0;

  const handleAddQuantity = () => {
    setQuantity((q) => (stock > 0 ? Math.min(q + 1, stock) : q + 1));
  };

  const handledeleteQuantity = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const handleSubmit = () => {
    if (outOfStock) return;
    addToBasket({ ...product, quantity });
    toast.success("Savatga qoʼshildi ✓");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm transition-all ease-in-out hover:text-brand py-4"
      >
        <GoArrowLeft className="text-xl" />
        <span>Orqaga</span>
      </Link>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-20 py-6">
        <div className="relative max-w-md w-full sm:w-[448px] h-64 sm:h-[448px] rounded-xl overflow-hidden">
          {product.productImageUrl?.[0]?.url ? (
            <Image className="absolute w-full h-full sm:object-cover" fill src={product.productImageUrl[0].url} alt={product.title} />
          ) : (
            <NoPhoto className="absolute inset-0" />
          )}
        </div>
        <div className="space-y-8">
          <div className='space-y-4'>
            <h2 className="sm:text-2xl font-semibold">
              {product.title}
            </h2>
            <p className="text-lg">
              {product.description}
            </p> 
          </div>
          <div className="rounded-xl border border-gray-300 flex items-center gap-8 w-fit py-1.5 px-2">
            <button onClick={handledeleteQuantity} disabled={quantity == 1} className="size-9 bg-gray-100 flex items-center justify-center rounded-full">
              -
            </button>
            <div className="w-14 border-b">
              <span className="block text-center">{quantity}</span>
            </div>
            <button
              onClick={handleAddQuantity}
              disabled={outOfStock || (stock > 0 && quantity >= stock)}
              className="size-9 bg-brand text-white flex items-center justify-center rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
          <div>
            <div className="text-sm text-gray-500">Umumiy</div>
            <div className="font-bold">{FormattedPrice(product.price * quantity)} UZS</div>
            {outOfStock ? (
              <div className="text-sm font-medium text-brand mt-1">Hozircha sotuvda yoʼq</div>
            ) : stock <= 5 ? (
              <div className="text-sm font-medium text-amber-600 mt-1">Faqat {stock} dona qoldi</div>
            ) : null}
          </div>
          <button
            onClick={handleSubmit}
            disabled={outOfStock}
            className="flex items-center justify-center gap-2 bg-brand transition-all ease-in-out hover:bg-brand-600 rounded-xl max-w-lg w-full text-white p-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {load ? <Loader /> : (
              <>
                <BsCartDash className="text-white text-xl" />
                <span>{outOfStock ? "Sotuvda yoʼq" : "Savatga qoʼshish"}</span>
              </>
            )}
          </button>          
        </div>
      </div>
    </div>
  )
}

export default ProductContent