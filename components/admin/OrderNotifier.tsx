"use client";
import { useEffect, useRef } from "react";
import toast, { Toast } from "react-hot-toast";
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
    const items = `${o.totalQuantity ?? o.basketItems?.length ?? 0} dona`;
    const channel = o.channel === "store" ? "Doʼkon" : "Sayt";

    // Enterprise "liquid glass" order alert (pure CSS backdrop-blur, brand-tinted)
    // with a one-tap link straight to the order.
    toast.custom(
      (t: Toast) => (
        <div className={`glass-toast pointer-events-auto ${t.visible ? "" : "opacity-0"}`}>
          <div className="flex items-start gap-3 w-[340px] max-w-[90vw] rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-[0_8px_40px_rgba(194,26,26,0.18)] ring-1 ring-black/5 backdrop-blur-xl">
            <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-lg text-white shadow-brand">
              🛒
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight text-[#1A1414]">Yangi buyurtma!</p>
              <p className="truncate text-sm text-[#575353]">
                {name} · {channel}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-brand">
                {total} · {items}
              </p>
              <a
                href="/admin-dashboard/orders"
                onClick={() => toast.dismiss(t.id)}
                className="mt-2 inline-block rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A91616]"
              >
                Buyurtmani koʼrish →
              </a>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              aria-label="Yopish"
              className="shrink-0 text-[#9A9595] hover:text-[#575353]"
            >
              ✕
            </button>
          </div>
        </div>
      ),
      { duration: 8000 }
    );

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
