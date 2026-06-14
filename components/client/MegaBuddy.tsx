"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";

// WebGL mesh-gradient is client-only — load without SSR.
const MeshGradient = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.MeshGradient),
  { ssr: false }
);

// megahome "buddy" — the real WebGL mesh-gradient blob in brand reds, with
// cursor-tracking eyes + blink + a gentle float. Rebuilt to be robust:
//  • the gradient canvas is clipped by a plain CSS-rounded div (NOT an SVG
//    foreignObject, which many browsers fail to clip → a weird square), and
//  • the eyes track via a ref/direct style write (no per-mousemove re-render,
//    so the shader never churns).
// Storefront only, bottom-LEFT (the cart owns bottom-right). Click = back to top.
const BRAND_COLORS = ["#FFD9C2", "#FF8F8F", "#E23B3B", "#C21A1A", "#5B0D0D"];

const MegaBuddy = () => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const eyesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      const eyes = eyesRef.current;
      if (!el || !eyes) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const max = 3;
      const x = Math.max(-max, Math.min(max, (e.clientX - cx) * 0.04));
      const y = Math.max(-max, Math.min(max, (e.clientY - cy) * 0.04));
      eyes.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Yuqoriga qaytish"
      title="Yuqoriga"
      animate={reduce ? undefined : { y: [0, -8, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      className="fixed bottom-5 left-5 md:bottom-10 md:left-10 z-40 size-14 md:size-16 cursor-pointer outline-none rounded-3xl focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      {/* Blob: brand mesh gradient (canvas) clipped to an organic squircle by CSS.
          .brand-buddy is the static fallback if WebGL is unavailable. */}
      <div className="relative size-full overflow-hidden brand-buddy rounded-[42%_58%_55%_45%/48%_42%_58%_52%] shadow-lg shadow-brand/30">
        <MeshGradient colors={BRAND_COLORS} className="absolute inset-0 size-full" speed={reduce ? 0 : 1} />
      </div>
      {/* Eyes — tracked via ref (no re-render), blink via CSS */}
      <div ref={eyesRef} className="absolute inset-0 flex items-center justify-center gap-2">
        <span className="block w-2 h-3 md:w-2.5 md:h-3.5 rounded-full bg-[#1A1414] origin-center motion-safe:animate-[buddyBlink_3.4s_infinite]" />
        <span className="block w-2 h-3 md:w-2.5 md:h-3.5 rounded-full bg-[#1A1414] origin-center motion-safe:animate-[buddyBlink_3.4s_infinite]" />
      </div>
    </motion.button>
  );
};

export default MegaBuddy;
