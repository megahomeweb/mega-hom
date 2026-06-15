"use client"
import Loader from '@/components/Loader'
import { FormattedPrice } from '@/utils'
import useCartProductStore from '@/zustand/useCartStore'
import useProductStore from '@/zustand/useProductStore'
import Image from 'next/image'
import Link from 'next/link'
import NoPhoto from '@/components/NoPhoto'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BsCartDash } from 'react-icons/bs'
import { GoArrowLeft } from 'react-icons/go'

const ProductContent = ({productID}: {productID:string}) => {
  const { fetchSingleProduct, loading, product } = useProductStore();
  const { addToBasket, getItemQuantity, load, calculateTotals } = useCartProductStore();
  const [quantity, setQuantity] = useState(1);
  const navigate = useRouter();
  
  const quantityInBasket = getItemQuantity(productID);
  useEffect(() => {
    if (productID) {
      fetchSingleProduct(productID);
      setQuantity(quantityInBasket || 1);
    }
  }, [fetchSingleProduct, productID, quantityInBasket]);

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader />
      </div>
    );
  }

  const handleAddQuantity = () => {
    setQuantity(quantity + 1);
  };

  const handledeleteQuantity = () => {
    setQuantity(quantity - 1);
  };

  const handleSubmit = async () => {
    addToBasket({...product, quantity: quantity});
    calculateTotals();
    toast.success("Add cart product successfully");
    navigate.push("/");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm transition-all ease-in-out hover:text-red-500 py-4"
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
            <button onClick={handleAddQuantity} className="size-9 bg-brand text-white flex items-center justify-center rounded-full">
              +
            </button>
          </div>
          <div>
            <div className="text-sm text-gray-500">Umumiy</div>
            <div className="font-bold">{FormattedPrice(product.price)} UZS</div>
          </div>
          <button
            onClick={handleSubmit}
            className="flex items-center justify-center gap-2 bg-brand transition-all ease-in-out hover:bg-brand-600 rounded-xl max-w-lg w-full text-white p-3"
          >
            {load ? <Loader /> : (
              <>
                <BsCartDash className="text-white text-xl" />
                <span>Savatga qo&apos;shish</span>
              </>
            )}
          </button>          
        </div>
      </div>
    </div>
  )
}

export default ProductContent