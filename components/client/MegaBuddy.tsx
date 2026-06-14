"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";

// The WebGL mesh-gradient is client-only — load it without SSR so the server
// never touches WebGL (and there's a brand-gradient fallback behind it).
const MeshGradient = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.MeshGradient),
  { ssr: false }
);

// megahome "buddy" — the real animated mesh-gradient shader blob, re-coloured to
// the brand reds, with cursor-tracking eyes, a blink and a gentle float.
// Storefront only, bottom-LEFT (the cart owns bottom-right); appears once you
// scroll, click to float back to the top. Honours prefers-reduced-motion.
const BRAND_COLORS = ["#FFD9C2", "#FF8F8F", "#E23B3B", "#C21A1A", "#5B0D0D"];

const MegaBuddy = () => {
  const reduce = useReducedMotion();
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const max = 8;
      setEye({
        x: Math.max(-max, Math.min(max, (e.clientX - cx) * 0.06)),
        y: Math.max(-max, Math.min(max, (e.clientY - cy) * 0.06)),
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label="Yuqoriga qaytish"
      title="Yuqoriga"
      onClick={toTop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toTop();
        }
      }}
      animate={reduce ? undefined : { y: [0, -8, 0], scaleY: [1, 1.06, 1] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "top center" }}
      className="fixed bottom-5 left-5 md:bottom-10 md:left-10 z-50 w-16 md:w-20 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-3xl"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="231"
        height="289"
        viewBox="0 0 231 289"
        className="w-full h-auto drop-shadow-xl"
      >
        <defs>
          <clipPath id="megaBuddyClip">
            <path d="M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z" />
          </clipPath>
        </defs>
        <foreignObject width="231" height="289" clipPath="url(#megaBuddyClip)">
          {/* brand-buddy = static brand gradient fallback if WebGL is unavailable */}
          <div className="w-full h-full brand-buddy">
            <MeshGradient colors={BRAND_COLORS} className="w-full h-full" speed={reduce ? 0 : 1} />
          </div>
        </foreignObject>
        <motion.ellipse
          rx="20"
          ry="30"
          fill="#1A1414"
          className="mega-buddy-eye"
          animate={{ cx: 80 + eye.x, cy: 120 + eye.y }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
        />
        <motion.ellipse
          rx="20"
          ry="30"
          fill="#1A1414"
          className="mega-buddy-eye"
          animate={{ cx: 150 + eye.x, cy: 120 + eye.y }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
        />
      </svg>
      <style jsx>{`
        .mega-buddy-eye {
          animation: megaBuddyBlink 3.2s infinite ease-in-out;
        }
        @keyframes megaBuddyBlink {
          0%, 90%, 100% {
            ry: 30px;
          }
          95% {
            ry: 4px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mega-buddy-eye {
            animation: none;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default MegaBuddy;
