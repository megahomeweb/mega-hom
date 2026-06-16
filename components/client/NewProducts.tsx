"use client"
import { Swiper, SwiperSlide } from "swiper/react";
import { useEffect, useRef } from "react";
import { IconChevron } from "../icons";
import { Autoplay, Navigation } from "swiper/modules";
import { Swiper as SwiperType } from 'swiper';
import Card from "./Card";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import useProductStore from "@/zustand/useProductStore";
import Loader from "../Loader";

const NewProducts = () => {
  const swiperRef = useRef<SwiperType>(null);
  const { loading, products, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts]);

  const fresh = products.filter((p) => p.isNew && !p.isHidden);

  // Only show the loader while genuinely loading; hide the whole section when
  // nothing is flagged "New".
  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader />
      </div>
    );
  }

  if (!fresh.length) return null;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <h2 className="font-brand text-3xl sm:text-4xl font-bold pb-5">Yangi mahsulotlar</h2>
      <div className="relative">
        <Swiper
          slidesPerView={2}
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper;
          }}
          spaceBetween={10}
          navigation={{
            prevEl: ".swiper-button-prev",
            nextEl: ".swiper-button-next",
          }}
          autoplay={{
            delay: 6000,
            disableOnInteraction: true,
            stopOnLastSlide: true,
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 24,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 20,
            },
          }}
          modules={[Navigation, Autoplay]}
          className="swiperNewProducts !static"
        >
          {fresh.map((card, index) => (
            <SwiperSlide key={index} className="!h-auto">
              <Card
                img={card.productImageUrl}
                title={card.title}
                description={card.description}
                currentPrice={card.price}
                quantity={card.quantity}
                href={`/product/${card.id}`}
              />
            </SwiperSlide>
          ))}

          <button
            type="button"
            onClick={() => swiperRef.current?.slidePrev()}
            className={`${fresh.length <= 4 && 'lg:hidden'} disabled:opacity-40 sm:absolute top-1/2 sm:-translate-y-1/2 -left-5 bg-white rounded-full border border-brand text-brand rotate-90 z-50 p-1.5 shadow-md mt-5`}
          >
             <IconChevron />
          </button>
          <button
            type="button"
            onClick={() => swiperRef.current?.slideNext()}
            className={`${fresh.length <= 4 && 'lg:hidden'} disabled:opacity-40 sm:absolute top-1/2 sm:-translate-y-1/2 -right-5 bg-white rounded-full border border-brand text-brand -rotate-90 z-50 p-1.5 shadow-md mt-5 ml-3`}
          >
            <IconChevron />
          </button>
        </Swiper>
      </div>
    </div>
  );
}

export default NewProducts