"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { FirebaseError } from "firebase/app";
import { signInWithGoogle } from "@/utils/googleAuth";
import { isStaffPlus } from "@/lib/roles";

// One-tap Google sign-in / sign-up, shared by the login and signup pages.
const GoogleAuthButton = ({ disabled }: { disabled?: boolean }) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const u = await signInWithGoogle();
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "users",
          JSON.stringify({ name: u.name, uid: u.uid, email: u.email, role: u.role })
        );
      }
      toast.success("Muvaffaqiyatli kirdingiz");
      router.push(isStaffPlus(u.role) ? "/admin-dashboard" : "/");
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      // user closing the popup isn't an error worth surfacing
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast.error(
          code === "auth/unauthorized-domain"
            ? "Bu domen Firebase'da ruxsat etilmagan (Authentication → Settings → Authorized domains)"
            : "Google orqali kirishda xatolik"
        );
      }
      console.error("Google auth error:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-700 py-2.5 rounded-md font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
    >
      <FcGoogle className="text-xl" />
      {busy ? "Kirilmoqda…" : "Google bilan davom etish"}
    </button>
  );
};

export default GoogleAuthButton;
