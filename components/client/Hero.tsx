"use client"
import React, { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import Image from "next/image";
import { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

type SwiperEventCallback = (s: SwiperType, time: number, progress: number) => void;

// Brandbook (vol.1) category banners. Each source art is pre-padded to a clean
// 16:9 with an edge-matched margin (see public/banner-*.jpg) so object-cover
// fills the hero with zero cropping of the headline or product photography.
const SLIDES = [
  { src: "/banner-interior.jpg", alt: "Interier jihozlar va uy mebeli" },
  { src: "/banner-kitchen.jpg", alt: "Maishiy texnika va oshxona jihozlari" },
  { src: "/banner-office.jpg", alt: "Ofis mebeli — qulay ish muhiti" },
  { src: "/banner-security.jpg", alt: "Xavfsizlik va safar" },
];

const Hero = () => {
  const progressCircle = useRef<SVGSVGElement>(null);
  const progressContent = useRef<HTMLSpanElement | null>(null);

  const onAutoplayTimeLeft: SwiperEventCallback = (s, time, progress) => {
    if (progressCircle.current) {
      progressCircle.current.style.setProperty('--progress', `${1 - progress}`);
    }
    if (progressContent.current) {
      progressContent.current.textContent = `${Math.ceil(time / 1000)}s`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Swiper
        spaceBetween={30}
        centeredSlides={true}
        loop={true}
        autoplay={{
          delay: 4500,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        navigation={true}
        modules={[Autoplay, Pagination, Navigation]}
        onAutoplayTimeLeft={onAutoplayTimeLeft}
        className="mySwiper rounded-2xl overflow-hidden"
      >
        {SLIDES.map((slide, i) => (
          <SwiperSlide key={slide.src} className="!h-auto">
            <div className="relative w-full aspect-[16/9] bg-white">
              <Image
                fill
                src={slide.src}
                alt={slide.alt}
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority={i === 0}
              />
            </div>
          </SwiperSlide>
        ))}

        {/* Custom Autoplay Progress */}
        <div className="autoplay-progress w-8 sm:w-12 h-8 sm:h-12 text-xs">
          <svg viewBox="0 0 48 48" ref={progressCircle}>
            <circle cx="24" cy="24" r="20"></circle>
          </svg>
          <span ref={progressContent}></span>
        </div>
      </Swiper>
    </div>
  );
}

export default Hero