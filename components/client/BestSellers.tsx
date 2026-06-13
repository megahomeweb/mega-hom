"use client"
import React, { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { Swiper as SwiperType } from 'swiper';
import { IconChevron } from "../icons";

import "swiper/css";
import Card from "./Card";
import useProductStore from "@/zustand/useProductStore";
import Loader from "../Loader";

const BestSellers = () => {
  const swiperRef = useRef<SwiperType>(null);
  const { loading, products, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts]);

  const best = products.filter((p) => p.isBest && !p.isHidden);

  // Only show the loader while genuinely loading; hide the whole section when
  // nothing is flagged "Best" (no more empty heading + empty carousel).
  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader />
      </div>
    );
  }

  if (!best.length) return null;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <h2 className="text-3xl sm:text-4xl font-bold pb-5">Sotuv xitlari</h2>
      <div className="relative">
        <Swiper
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper;
          }}
          slidesPerView={2}
          spaceBetween={10}
          navigation={{
            prevEl: ".swiper-button-pre",
            nextEl: ".swiper-button-nex",
          }}
          autoplay={{
            delay: 6000,
            disableOnInteraction: true,
            stopOnLastSlide: true,
          }}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 16 },
            768: { slidesPerView: 3, spaceBetween: 24 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
          }}
          modules={[Navigation, Autoplay]}
          className="swiperBestSellers !static"
        >
          {best.map((card, index) => (
            <SwiperSlide key={index} className="!flex !flex-col !h-auto">
              <Card
                img={card.productImageUrl}
                title={card.title}
                description={card.description}
                currentPrice={card.price}
                href={`/product/${card.id}`}
              />
            </SwiperSlide>
          ))}

          <button
            type="button"
            onClick={() => swiperRef.current?.slidePrev()}
            className={`${best.length <= 4 && 'lg:hidden'} disabled:opacity-40 sm:absolute top-1/2 sm:-translate-y-1/2 -left-5 bg-white rounded-full border border-brand text-brand rotate-90 z-50 p-1.5 shadow-md mt-5`}
          >
             <IconChevron />
          </button>
          <button
            type="button"
            onClick={() => swiperRef.current?.slideNext()}
            className={`${best.length <= 4 && 'lg:hidden'} disabled:opacity-40 sm:absolute top-1/2 sm:-translate-y-1/2 -right-5 bg-white rounded-full border border-brand text-brand -rotate-90 z-50 p-1.5 shadow-md mt-5 ml-3`}
          >
            <IconChevron />
          </button>
        </Swiper>
      </div>
    </div>
  )
}

export default BestSellers