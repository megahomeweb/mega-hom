"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, fireDB } from "../../firebase/FirebaseConfig";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { isStaffPlus } from "@/lib/roles";
import { isSyntheticEmail, loginIdentifierToEmail } from "@/utils/authEmail";
import GoogleAuthButton from "./GoogleAuthButton";
import AuthShell from "./AuthShell";
import Loader from "../Loader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

interface StoredUser {
  name: string;
  uid: string;
  email: string;
  phone?: string;
  role: string; // owner | admin | manager | staff | user
  date?: string;
}

const friendlyAuthError = (code: string): string => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email/telefon yoki parol noto'g'ri";
    case "auth/invalid-email":
      return "Email manzili noto'g'ri formatda";
    case "auth/too-many-requests":
      return "Juda ko'p urinish. Biroz kuting va qayta urining";
    case "auth/user-disabled":
      return "Bu hisob bloklangan";
    case "auth/network-request-failed":
      return "Internet aloqasini tekshiring";
    case "auth/unauthorized-domain":
      return "Bu domen Firebase'da ruxsat etilmagan (Firebase Console → Authentication → Settings → Authorized domains)";
    case "auth/operation-not-allowed":
      return "Email/Parol orqali kirish Firebase'da yoqilmagan";
    default:
      return `Kirishda xatolik: ${code}`;
  }
};

const LoginContent = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) {
      toast.error("Email/telefon va parolni kiriting");
      return;
    }

    setLoading(true);
    try {
      // Phone-registered accounts authenticate via their synthetic address —
      // the user types the same phone number they signed up with.
      const cred = await signInWithEmailAndPassword(
        auth,
        loginIdentifierToEmail(form.email),
        form.password
      );

      // Never surface a phone-derived synthetic auth address as the email.
      const visibleAuthEmail = isSyntheticEmail(cred.user.email) ? "" : cred.user.email || "";

      let stored: StoredUser;
      try {
        // Prefer the uid-keyed user doc; fall back to the legacy auto-id doc
        // (matched by the uid field) and self-heal it to a uid-keyed doc so
        // future reads and Security Rules resolve the role directly.
        const directRef = doc(fireDB, "user", cred.user.uid);
        const directSnap = await getDoc(directRef);
        let data: Partial<StoredUser> | null = directSnap.exists()
          ? (directSnap.data() as Partial<StoredUser>)
          : null;

        if (!data) {
          const snap = await getDocs(
            query(collection(fireDB, "user"), where("uid", "==", cred.user.uid))
          );
          if (!snap.empty) {
            data = snap.docs[0].data() as Partial<StoredUser>;
            try {
              await setDoc(directRef, data, { merge: true });
            } catch (healErr) {
              console.warn("Login self-heal skipped:", healErr);
            }
          }
        }

        if (!data) {
          // Auth account exists but no Firestore profile — most common cause
          // of "correct password but error". Fall back gracefully.
          stored = {
            name: cred.user.displayName || visibleAuthEmail || "User",
            uid: cred.user.uid,
            email: visibleAuthEmail,
            role: "user",
          };
          toast.error(
            "Hisob topildi, lekin Firestore'da 'user' hujjati yo'q. Admin uchun rol qo'lda qo'shilishi kerak."
          );
        } else {
          stored = {
            name: data.name || visibleAuthEmail || "User",
            uid: data.uid || cred.user.uid,
            email: data.email || visibleAuthEmail,
            phone: (data as { phone?: string | null }).phone || undefined,
            role: data.role || "user",
          };
        }
      } catch (firestoreErr) {
        // Firestore rules or network — don't lock the user out of their account.
        console.error("Firestore profile lookup failed:", firestoreErr);
        toast.error(
          "Profil ma'lumotini olishda xatolik (Firestore qoidalari yoki tarmoq)"
        );
        stored = {
          name: visibleAuthEmail || "User",
          uid: cred.user.uid,
          email: visibleAuthEmail,
          role: "user",
        };
      }

      localStorage.setItem("users", JSON.stringify(stored));
      toast.success("Muvaffaqiyatli kirdingiz");
      setForm({ email: "", password: "" });

      router.push(isStaffPlus(stored.role) ? "/admin-dashboard" : "/");
    } catch (err) {
      const code =
        err instanceof FirebaseError ? err.code : "auth/unknown-error";
      toast.error(friendlyAuthError(code));
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {loading && <Loader />}

      <div className="w-full max-w-[420px]">
        <header className="mb-8">
          <h1 className="font-brand text-3xl font-bold tracking-tight text-[#1A1414]">
            Kirish
          </h1>
          <p className="mt-2 text-base text-[#575353]">
            Hisobingizga kiring va doʼkoningizni boshqaring.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-5"
          noValidate
        >
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-[#1A1414]"
            >
              Email yoki telefon raqam
            </label>
            <div className="relative mt-2">
              <FiMail
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9A9595]"
              />
              <input
                id="login-email"
                type="text"
                name="email"
                autoComplete="username"
                placeholder="siz@megahome.uz yoki +998 90 123 45 67"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="block w-full rounded-xl border border-[#E5E1E1] bg-white py-3.5 pl-11 pr-4 text-base text-[#1A1414] placeholder-[#9A9595] outline-none transition-colors focus:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-[#1A1414]"
            >
              Parol
            </label>
            <div className="relative mt-2">
              <FiLock
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9A9595]"
              />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Parolingiz"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="block w-full rounded-xl border border-[#E5E1E1] bg-white py-3.5 pl-11 pr-12 text-base text-[#1A1414] placeholder-[#9A9595] outline-none transition-colors focus:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Parolni yashirish" : "Parolni koʼrsatish"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-4 text-[#575353] outline-none transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
              >
                {showPassword ? (
                  <FiEyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <FiEye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-brand transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-safe:active:scale-[0.99]"
          >
            {loading ? "Kirilmoqda..." : "Kirish"}
          </button>

          <div className="flex items-center gap-4 py-1" aria-hidden="true">
            <span className="h-px flex-1 bg-[#E5E1E1]" />
            <span className="text-sm text-[#575353]">yoki</span>
            <span className="h-px flex-1 bg-[#E5E1E1]" />
          </div>

          <GoogleAuthButton disabled={loading} />
        </form>

        <p className="mt-8 text-base text-[#575353]">
          Hisobingiz yoʼqmi?{" "}
          <Link
            href="/sign-up"
            className="rounded font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Roʼyxatdan oʼting
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default LoginContent;
