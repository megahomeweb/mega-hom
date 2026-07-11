"use client"
import Loader from '@/components/Loader'
import { FormattedPrice } from '@/utils'
import useCartProductStore from '@/zustand/useCartStore'
import useProductStore from '@/zustand/useProductStore'
import Link from 'next/link'
import ProductImage from '@/components/ProductImage'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BsCartDash } from 'react-icons/bs'
import { GoArrowLeft } from 'react-icons/go'

const ProductContent = ({productID}: {productID:string}) => {
  const { fetchSingleProduct, loading, product } = useProductStore();
  const { addToBasket, getItemQuantity, load } = useCartProductStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

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

  // Reset the gallery to the first photo when navigating to a different product.
  useEffect(() => {
    setSelectedImage(0);
  }, [productID]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader />
      </div>
    );
  }
  // Loaded but nothing came back → a real "not found" state instead of an
  // infinite spinner (e.g. a stale/shared product link).
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-64 gap-3">
        <p className="text-lg font-medium text-slate-600">Mahsulot topilmadi</p>
        <Link
          href="/"
          className="rounded-xl bg-brand hover:bg-brand-600 text-white px-5 py-2.5 font-semibold transition-colors"
        >
          Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }

  const stock = Number(product.quantity) || 0;
  const outOfStock = stock <= 0;
  // Skip empty/malformed entries so the gallery never feeds next/image an empty src.
  const images = (product.productImageUrl ?? []).filter((im) => im?.url?.trim());
  const active = images[selectedImage] ?? images[0];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-28 lg:pb-0">
      <Link
        href="/"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm transition-all ease-in-out hover:text-brand py-4"
      >
        <GoArrowLeft className="text-xl" />
        <span>Orqaga</span>
      </Link>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-20 py-6">
        {/* Gallery: large selected image + thumbnail strip (shows ALL photos a
            product has — e.g. one product in several colours). */}
        <div className="w-full sm:w-[448px] space-y-3">
          <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-100">
            <ProductImage
              key={active?.path || active?.url || "none"}
              className="absolute w-full h-full object-cover"
              fill
              sizes="448px"
              priority
              src={active?.url}
              alt={product.title}
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <button
                  key={img.path || img.url || i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  aria-label={`Rasm ${i + 1}`}
                  aria-current={i === selectedImage}
                  className={`relative size-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === selectedImage ? "border-brand" : "border-transparent hover:border-brand-300"
                  }`}
                >
                  <ProductImage fill sizes="64px" className="object-cover" src={img.url} alt="" />
                </button>
              ))}
            </div>
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
            className="hidden lg:flex items-center justify-center gap-2 bg-brand transition-all ease-in-out hover:bg-brand-600 rounded-xl max-w-lg w-full text-white p-3 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Mobile sticky add-to-cart bar — keeps the primary CTA in reach on phones */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3">
        <div className="leading-tight shrink-0">
          <p className="text-[11px] text-slate-400">Narx</p>
          <p className="font-bold text-brand">{FormattedPrice(product.price * quantity)} UZS</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={outOfStock}
          className="ml-auto flex flex-1 items-center justify-center gap-2 bg-brand hover:bg-brand-600 transition-colors rounded-xl text-white p-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BsCartDash className="text-white text-xl" />
          <span>{outOfStock ? "Sotuvda yoʼq" : "Savatga qoʼshish"}</span>
        </button>
      </div>
    </div>
  )
}

export default ProductContent