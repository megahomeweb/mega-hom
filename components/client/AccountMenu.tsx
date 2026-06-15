"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FiLogOut, FiUser } from "react-icons/fi";
import { auth } from "@/firebase/FirebaseConfig";
import { isStaffPlus } from "@/lib/roles";

interface SessionUser {
  name: string;
  email: string;
  role: string;
}

// Auth-aware header control. Reacts to the real Firebase session (not a static
// link), so after login it shows the account + a logout, and staff get a link
// into the admin panel. Logged out → the "Kirish" button.
const AccountMenu = () => {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setUser(null);
        return;
      }
      let stored: Partial<SessionUser> | null = null;
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem("users") : null;
        if (raw) stored = JSON.parse(raw);
      } catch {
        stored = null;
      }
      setUser({
        name: stored?.name || u.displayName || u.email || "Foydalanuvchi",
        email: u.email || stored?.email || "",
        role: stored?.role || "user",
      });
    });
    return () => unsub();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("logout failed", e);
    }
    if (typeof window !== "undefined") localStorage.removeItem("users");
    setUser(null);
  };

  const pill =
    "shrink-0 inline-flex items-center gap-2 rounded-md border border-brand text-brand hover:bg-brand hover:text-white transition-colors px-3 py-2 text-sm font-semibold";

  if (!user) {
    return (
      <Link href="/login" aria-label="Kirish" className={pill}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" x2="3" y1="12" y2="12" />
        </svg>
        <span className="hidden sm:inline">Kirish</span>
      </Link>
    );
  }

  const firstName = user.name.split(" ")[0];
  return (
    <Popover className="relative shrink-0">
      <PopoverButton className={`${pill} outline-none`}>
        <FiUser className="size-4" />
        <span className="hidden sm:inline max-w-28 truncate">{firstName}</span>
      </PopoverButton>
      <PopoverPanel
        anchor="bottom end"
        className="w-56 bg-white rounded-xl shadow-lg border border-gray-100 p-2 mt-2 z-50"
      >
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="font-semibold text-gray-800 truncate capitalize">{user.name}</p>
          {user.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
        </div>
        {isStaffPlus(user.role) && (
          <Link
            href="/admin-dashboard"
            className="block px-3 py-2 rounded-lg text-sm text-brand hover:bg-brand-50 font-medium"
          >
            Admin panel
          </Link>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 font-medium"
        >
          <FiLogOut className="size-4" /> Chiqish
        </button>
      </PopoverPanel>
    </Popover>
  );
};

export default AccountMenu;
