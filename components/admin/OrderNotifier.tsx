"use client";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { collection, onSnapshot, query } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { Order } from "@/lib/types";
import { FormattedPrice } from "@/utils";

// Real-time new-order alert for the admin: plays a sound, shows an in-app toast,
// fires a desktop notification (even when the tab is in the background) and
// flashes the tab title. Mounted once in the admin layout so it works on every
// admin page. It only alerts for orders that arrive WHILE the admin is online
// (the first snapshot is treated as the baseline).
const OrderNotifier = () => {
  const seen = useRef<Set<string>>(new Set());
  const ready = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Browsers need a user gesture to start audio; grab the chance to also ask
    // for desktop-notification permission.
    const unlock = () => {
      if (!audioRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          try {
            audioRef.current = new Ctx();
          } catch {
            /* ignore */
          }
        }
      }
      audioRef.current?.resume?.();
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    const unsub = onSnapshot(
      query(collection(fireDB, "orders")),
      (snap) => {
        if (!ready.current) {
          snap.forEach((d) => seen.current.add(d.id));
          ready.current = true;
          return; // baseline — don't alert for orders that already existed
        }
        snap.docChanges().forEach((ch) => {
          if (ch.type === "added" && !seen.current.has(ch.doc.id)) {
            seen.current.add(ch.doc.id);
            notify(ch.doc.data() as Order);
          }
        });
      },
      (err) => console.error("OrderNotifier subscription error:", err)
    );

    return () => {
      unsub();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playDing = () => {
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const tones: [number, number][] = [
        [880, 0],
        [1320, 0.13],
      ];
      tones.forEach(([freq, t]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.32);
      });
    } catch {
      /* ignore */
    }
  };

  const notify = (o: Order) => {
    playDing();
    const name = `${o.clientName ?? ""} ${o.clientLastName ?? ""}`.trim() || "Mijoz";
    const total = `${FormattedPrice(o.totalPrice)} UZS`;

    toast.success(`🛒 Yangi buyurtma! ${name} — ${total}`, { duration: 8000 });

    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("🛒 Yangi buyurtma — megahome.uz", {
          body: `${name}\n${total}`,
          icon: "/favicon.png",
        });
      }
    } catch {
      /* ignore */
    }

    if (typeof document !== "undefined") {
      document.title = "🔔 Yangi buyurtma! — Mega Home";
      window.setTimeout(() => {
        document.title = "Mega Home — Admin panel";
      }, 6000);
    }
  };

  return null;
};

export default OrderNotifier;
