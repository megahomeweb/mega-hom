"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// The buddy is pure decoration (WebGL shader + framer-motion). Loading it during
// the initial storefront render slowed first paint, so we defer it: the heavy
// chunk is code-split (ssr:false) and only mounts once the browser is IDLE —
// after the page is interactive. Nothing about the landing's critical path
// touches WebGL anymore.
const MegaBuddy = dynamic(() => import("./MegaBuddy"), { ssr: false });

export default function MegaBuddyLazy() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (w.requestIdleCallback) {
      idleId = w.requestIdleCallback(() => setShow(true), { timeout: 3000 });
    } else {
      timeoutId = setTimeout(() => setShow(true), 1800);
    }
    return () => {
      if (idleId !== undefined && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return show ? <MegaBuddy /> : null;
}
