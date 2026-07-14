"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome, FiShoppingCart, FiClipboard, FiBox, FiUsers, FiDollarSign,
  FiTruck, FiUserCheck, FiMoreHorizontal, FiLogOut, FiX, FiBarChart2,
  FiShoppingBag,
} from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import { IconType } from "react-icons";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/FirebaseConfig";
import { useRole } from "./RoleContext";
import { Role, ROLE_LABELS, isManagerPlus, isAdminPlus } from "@/lib/roles";

type Item = { icon: IconType; label: string; href: string };

// Mobile-only bottom dock for the admin panel — the primary navigation on phones
// (the desktop top-nav is hidden < lg). Role-aware: staff see the till + orders;
// manager+ get the catalog/inventory/customers; admin+ get staff management. The
// "Yana" button opens a sheet with everything else + profile + logout.
const AdminDock = () => {
  const me = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const mgr = isManagerPlus(me?.role);
  const adm = isAdminPlus(me?.role);

  const primary: Item[] = [
    { icon: FiHome, label: "Asosiy", href: "/admin-dashboard" },
    { icon: FiShoppingCart, label: "Kassa", href: "/admin-dashboard/pos" },
    { icon: FiClipboard, label: "Buyurtma", href: "/admin-dashboard/orders" },
    ...(mgr ? [{ icon: FiBox, label: "Ombor", href: "/admin-dashboard/inventory" }] : []),
  ];

  const more: Item[] = [
    // Back to the storefront WITHOUT logging out — the session stays, and the
    // store header's account menu links back here (Admin panel) to complete
    // the loop. Visible to every rank.
    { icon: FiShoppingBag, label: "Doʼkonga qaytish", href: "/" },
    ...(mgr ? [{ icon: FiBarChart2, label: "Tahlil", href: "/admin-dashboard/analytics" }] : []),
    ...(mgr ? [{ icon: FiUsers, label: "Mijozlar", href: "/admin-dashboard/customers" }] : []),
    ...(mgr ? [{ icon: FiDollarSign, label: "Xarajatlar", href: "/admin-dashboard/expenses" }] : []),
    ...(mgr ? [{ icon: FiTruck, label: "Yetkazib beruvchilar", href: "/admin-dashboard/suppliers" }] : []),
    ...(mgr ? [{ icon: BsQrCode, label: "QR kodlar", href: "/admin-dashboard/qr-codes" }] : []),
    ...(adm ? [{ icon: FiUserCheck, label: "Xodimlar", href: "/admin-dashboard/staff" }] : []),
  ];

  const isActive = (href: string) =>
    href === "/admin-dashboard" ? pathname === href : pathname.startsWith(href);

  const logout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    if (typeof window !== "undefined") localStorage.removeItem("users");
    router.push("/login");
  };

  const tile =
    "flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 min-w-[58px] transition-colors";

  return (
    <>
      {/* ---- "Yana" bottom sheet ---- */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/30 lg:hidden"
              onClick={() => setMoreOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed bottom-0 inset-x-0 z-[70] lg:hidden bg-white rounded-t-3xl shadow-2xl px-4 pt-3 pb-8"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                <div className="size-9 rounded-full bg-brand text-white flex items-center justify-center font-bold shrink-0">
                  {(me?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700 text-sm leading-tight truncate">{me?.name || "Foydalanuvchi"}</p>
                  <p className="text-xs text-slate-400">{ROLE_LABELS[(me?.role as Role) ?? "user"]}</p>
                </div>
                <button onClick={() => setMoreOpen(false)} className="ml-auto text-slate-400 hover:text-slate-700">
                  <FiX className="text-xl" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {more.map((it) => (
                  <Link
                    key={it.label}
                    href={it.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 hover:bg-brand-50 text-slate-600 text-center"
                  >
                    <it.icon className="text-2xl text-brand-500" />
                    <span className="text-[11px] leading-tight">{it.label}</span>
                  </Link>
                ))}
                <button
                  onClick={logout}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 text-center"
                >
                  <FiLogOut className="text-2xl" />
                  <span className="text-[11px]">Chiqish</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Dock ---- */}
      <motion.nav
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="fixed bottom-3 inset-x-0 z-50 flex justify-center lg:hidden pointer-events-none"
      >
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-3xl bg-white/90 backdrop-blur-lg border border-brand-100 shadow-[0_10px_34px_rgba(0,0,0,0.14)] px-2 py-1.5">
          {primary.map((it) => {
            const active = isActive(it.href);
            return (
              <Link key={it.label} href={it.href}>
                <motion.span whileTap={{ scale: 0.86 }} className={`${tile} ${active ? "bg-brand text-white shadow-brand" : "text-slate-500"}`}>
                  <it.icon className="text-[23px]" />
                  <span className="text-[10px] font-medium">{it.label}</span>
                </motion.span>
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)} aria-label="Yana">
            <motion.span whileTap={{ scale: 0.86 }} className={`${tile} text-slate-500`}>
              <FiMoreHorizontal className="text-[23px]" />
              <span className="text-[10px] font-medium">Yana</span>
            </motion.span>
          </button>
        </div>
      </motion.nav>
    </>
  );
};

export default AdminDock;
