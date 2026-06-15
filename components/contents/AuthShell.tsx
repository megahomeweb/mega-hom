"use client";

import React from "react";
import Link from "next/link";
import { FiCheck, FiLock, FiShield, FiTruck, FiHeadphones } from "react-icons/fi";

/**
 * AuthShell — shared presentation shell for the /login and /sign-up screens.
 *
 * FINAL (synthesised) — Split-screen enterprise auth (Stripe / Mercury / Ramp).
 *
 * Layout:
 *  - LEFT  (lg+ only, ~45%): a solid brand-red panel — the megahome wordmark on
 *    a white chip, a confident headline, three platform-pillar value bullets,
 *    and a trust row — laid over a real, warm home-interior photo demoted to a
 *    textured background under a heavy brand → deep-red gradient. Brand
 *    identity dominates; the photo only adds warmth/texture. Falls back to a
 *    solid brand block if the CDN ever dies (the correct enterprise failure
 *    mode) — all panel text stays legible either way.
 *  - RIGHT (~55%): a clean, spacious, borderless white form COLUMN (no boxed
 *    card on desktop — the genuinely current Linear/Vercel register). Pages
 *    slot their form via `children`.
 *  - Below lg the panel is hidden and the form fills a single centered column,
 *    with a slim brand top-bar so the wordmark is never lost.
 *
 * This component owns ZERO auth logic — it is pure chrome. The page-specific
 * heading, sub-copy, form fields, submit button, divider, Google button and
 * footer link are all passed in as children / props by LoginContent and
 * SignUpContent, which keep their exact state + handler contract.
 *
 * Logo handling (verified against the real asset): /megahome-text.png is a
 * BLACK serif "MEGA HOME" wordmark with a RED roof tile + black Uzbek tagline
 * on a transparent background. We therefore NEVER invert it — it sits on a
 * white surface (a rounded chip on the red panel, and the slim mobile bar) so
 * the signature red roof stays red and the mark reads correctly.
 *
 * Image: applied as a CSS background-image (no next.config domain entry
 * needed). Documented fallback below is also a verified Unsplash interior.
 */

// Verified (HTTP 200, image/jpeg) warm modern interior — mustard accent
// armchair on natural wood, brass floor lamp, framed art, media console.
// Reads unmistakably as "home goods / furniture / decor" and harmonises with
// #C21A1A (the mustard is complementary, not clashing). Source (Unsplash,
// free for commercial use, no attribution required).
// Self-hosted (downloaded from Unsplash, photo-1586023492125 — free for
// commercial use) so the panel never depends on a third-party CDN at runtime.
const PANEL_IMAGE = "/auth-side.jpg";

// Documented fallback (also verified HTTP 200, Unsplash — Rebecca Chandler,
// styled showroom: bouclé sofa, travertine table, curated homeware):
// https://images.unsplash.com/photo-1750639258774-9a714379a093?auto=format&fit=crop&w=1100&h=1500&q=80

// Three platform pillars — frame megahome as real retail infrastructure, not a
// shop login. True, non-numeric claims only (no fabricated stat counters).
const VALUE_BULLETS = [
  "Onlayn doʼkon, kassa (POS) va ombor — barchasi bitta tizimda",
  "Ulgurji va chakana savdoni birga boshqaring",
  "Mijozlar, buyurtmalar va hisobotlar bir joyda",
];

// Bottom trust row — true claims, no invented numbers.
const TRUST = [
  { icon: FiShield, label: "Xavfsiz toʼlov" },
  { icon: FiTruck, label: "Tez yetkazib berish" },
  { icon: FiHeadphones, label: "24/7 qoʼllab-quvvatlash" },
];

const AuthShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full bg-white text-[#1A1414]">
      {/* ================= LEFT — brand panel (desktop only) ================= */}
      <aside className="relative hidden w-[45%] shrink-0 overflow-hidden bg-brand lg:flex">
        {/* Real interior photo, demoted to a textured background. A slow,
            restrained ken-burns runs only when motion is allowed (the
            `authKenBurns` keyframe + its reduced-motion kill-switch already
            live in app/globals.css). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-brand bg-cover bg-center opacity-[0.28] motion-safe:animate-[authKenBurns_38s_ease-in-out_infinite_alternate]"
          style={{ backgroundImage: `url('${PANEL_IMAGE}')` }}
        />
        {/* Brand gradient for legibility — white text over the deep-red end
            (#5B0D0D) measures ~13:1 (WCAG AAA). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-brand/95 via-brand/90 to-[#5B0D0D]/97"
        />
        {/* Soft bottom vignette to seat the trust row. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent"
        />

        {/* Panel content */}
        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          {/* Wordmark on a white chip — the dark PNG stays on a light surface
              so the red roof tile survives (never inverted). */}
          <div>
            <Link
              href="/"
              aria-label="Bosh sahifaga qaytish"
              className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/megahome-text.png"
                alt="megahome"
                className="h-7 w-auto xl:h-8"
              />
            </Link>
          </div>

          {/* Headline + value pillars */}
          <div className="max-w-md">
            <h2 className="font-brand text-[2rem] font-bold leading-[1.15] tracking-tight text-white xl:text-[2.5rem]">
              Doʼkoningizni bitta joydan boshqaring.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/85">
              megahome — onlayn doʼkon, doʼkondagi savdo va ulgurjini bitta
              ishonchli savdo platformasiga birlashtiradi.
            </p>

            <ul className="mt-9 space-y-4">
              {VALUE_BULLETS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/30"
                  >
                    <FiCheck className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span className="text-[15px] leading-relaxed text-white/95">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust row */}
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6">
            {TRUST.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm font-medium text-white/85"
              >
                <Icon className="h-4 w-4 flex-none text-white/75" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ===================== RIGHT — form column ===================== */}
      <main className="flex w-full flex-col lg:w-[55%]">
        {/* Mobile-only brand bar (the panel is hidden < lg). Wordmark stays on
            a light/white surface so the red roof tile survives. */}
        <div className="flex items-center justify-between border-b border-[#F0ECEC] px-5 py-4 lg:hidden">
          <Link
            href="/"
            aria-label="Bosh sahifaga qaytish"
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/megahome-text.png" alt="megahome" className="h-7 w-auto" />
          </Link>
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm font-medium text-[#575353] transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Doʼkonga qaytish
          </Link>
        </div>

        {/* The form slot — borderless, generously spaced, left-aligned column. */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
          {children}
        </div>

        {/* Legal / SSL line — 12px is acceptable here (non-essential). */}
        <div className="px-6 pb-8 text-center text-xs text-[#9A9595] sm:px-10 lg:px-16">
          <FiLock className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
          Maʼlumotlaringiz SSL bilan himoyalangan · © {new Date().getFullYear()} megahome
        </div>
      </main>
    </div>
  );
};

export default AuthShell;
