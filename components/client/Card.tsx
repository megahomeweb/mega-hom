import { ImageT } from "@/lib/types";
import Link from "next/link";
import ProductImage, { firstImageUrl } from "@/components/ProductImage";
import { FormattedPrice } from '@/utils'
import React from "react";

interface CardProps {
  img: ImageT[];
  title: string;
  description: string;
  currentPrice: number;
  href: string;
  quantity?: number;
}

const Card = ({ img, title, description, currentPrice, href, quantity }: CardProps) => {
  const stock = Number(quantity ?? 0);
  const outOfStock = quantity !== undefined && stock <= 0;
  const lowStock = stock > 0 && stock <= 5;
  const src = firstImageUrl(img);
  return (
    <Link
      href={href}
      className="flex flex-col h-full rounded border divide-y overflow-hidden shadow-sm"
    >
      <div className="relative w-full aspect-square shrink-0">
        <ProductImage
          src={src}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`w-full h-full object-cover ${outOfStock ? "opacity-60" : ""}`}
        />
        {(img?.length ?? 0) > 1 && (
          <span className="absolute top-2 right-2 bg-black/55 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full z-10">
            {img.length} rasm
          </span>
        )}
        {outOfStock ? (
          <span className="absolute top-2 left-2 bg-slate-800/85 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
            Sotuvda yoʼq
          </span>
        ) : lowStock ? (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
            Faqat {stock} dona
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 justify-between h-full p-3 sm:p-4">
        <div className="space-y-1">
          <span className="text-black hover:text-brand">
            <h3 className="sm:text-xl font-semibold">{title}</h3>
          </span>
          <p className="line-clamp-2 sm:line-clamp-3">{description}</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <span className="font-semibold text-brand">
              {FormattedPrice(currentPrice)} UZS
            </span>
          </div>
          <span
            className={`block text-center w-full rounded transition-all ease-in-out text-white p-2 ${
              outOfStock ? "bg-slate-300" : "bg-brand hover:bg-brand-600"
            }`}
          >
            {outOfStock ? "Sotuvda yoʼq" : "Buyurtma qilish"}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Card;
