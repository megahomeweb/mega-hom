import { ImageT } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { FormattedPrice } from '@/utils'
import React from "react";

interface CardProps {
  img: ImageT[];
  title: string;
  description: string;
  currentPrice: number;
  href: string;
}

const Card = ({ img, title, description, currentPrice, href }: CardProps) => {
  return (
    <Link
      href={href}
      className="flex flex-col h-full rounded border divide-y overflow-hidden shadow-sm"
    >
      <div className="relative w-full h-44 sm:h-72 shrink-0">
        <Image
          src={img[0].url ? img[0].url : `/sample.webp`}
          alt={title}
          fill
          className="w-full h-full object-cover"
        />
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
            <span className="font-medium text-brand animate-pulse">
              {FormattedPrice(currentPrice)} UZS
            </span>
          </div>
          <span className="block text-center w-full rounded bg-red-500 hover:bg-red-600 transition-all ease-in-out text-white p-2">
            Buyrutma qilish
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Card;