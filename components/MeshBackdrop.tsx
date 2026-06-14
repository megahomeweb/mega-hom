"use client";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";

// WebGL mesh-gradient is client-only — load without SSR.
const MeshGradient = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.MeshGradient),
  { ssr: false }
);

// Absolute-fill animated mesh-gradient backdrop. Place inside a
// `relative overflow-hidden` parent; put real content in a sibling with
// `relative z-10`. Honours prefers-reduced-motion (freezes the shader).
const MeshBackdrop = ({ colors, speed = 0.6 }: { colors: string[]; speed?: number }) => {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="absolute inset-0">
      <MeshGradient colors={colors} className="w-full h-full" speed={reduce ? 0 : speed} />
    </div>
  );
};

export default MeshBackdrop;
