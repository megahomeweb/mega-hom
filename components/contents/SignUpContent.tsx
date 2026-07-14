"use client";
import Link from "next/link";
import React, { useState } from "react";
import Loader from "../Loader";
import toast from "react-hot-toast";
import { Timestamp, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, fireDB } from "../../firebase/FirebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import GoogleAuthButton from "./GoogleAuthButton";
import AuthShell from "./AuthShell";
import { normalizePhone } from "@/utils/phone";
import { phoneAuthEmail } from "@/utils/authEmail";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiPhone } from "react-icons/fi";

// Mijoz roʼyxatdan oʼtish formasi: Ism + Telefon (majburiy) + Email (ixtiyoriy).
// Telefon — Oʼzbekiston uchun asosiy identifikator; email boʼlmasa auth uchun
// telefondan yasalgan sintetik manzil ishlatiladi (utils/authEmail.ts).
const inputCls =
  "block w-full rounded-xl border border-[#E5E1E1] bg-white py-3.5 pl-11 pr-4 text-base text-[#1A1414] placeholder-[#9A9595] outline-none transition-colors focus:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1";

const friendlySignupError = (code: string, phoneOnly: boolean): string => {
  switch (code) {
    case "auth/email-already-in-use":
      return phoneOnly
        ? "Bu telefon raqami bilan hisob allaqachon ochilgan — Kirish sahifasidan kiring"
        : "Bu email bilan hisob allaqachon ochilgan — Kirish sahifasidan kiring";
    case "auth/invalid-email":
      return "Email manzili notoʼgʼri formatda";
    case "auth/weak-password":
      return "Parol juda oddiy — kamida 6 ta belgi kiriting";
    case "auth/network-request-failed":
      return "Internet aloqasini tekshiring";
    case "auth/operation-not-allowed":
      return "Email/Parol orqali roʼyxatdan oʼtish Firebase'da yoqilmagan";
    default:
      return `Roʼyxatdan oʼtishda xatolik: ${code}`;
  }
};

const SignUpContent = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // navigate
  const navigate = useRouter();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  // Format as +998 (XX) XXX-XX-XX while typing (same UX as checkout).
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.startsWith("998")) value = value.slice(3);
    value = value.slice(0, 9);
    const formatted = value
      ? `+998 (${value.slice(0, 2)}) ${value.slice(2, 5)}${value.length > 5 ? "-" : ""}${value.slice(5, 7)}${value.length > 7 ? "-" : ""}${value.slice(7)}`
      : "";
    setForm((f) => ({ ...f, phone: formatted }));
  };

  const userSignupFunction = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const normPhone = normalizePhone(form.phone);

    if (!name) return toast.error("Ismingizni kiriting");
    if (!normPhone) return toast.error("Telefon raqamini toʼliq kiriting");
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      return toast.error("Email manzili notoʼgʼri formatda");
    if (form.password.length < 6)
      return toast.error("Parol kamida 6 ta belgidan iborat boʼlsin");

    // Real inbox when given; otherwise the deterministic phone-based address.
    const authEmail = email || phoneAuthEmail(normPhone);

    setLoading(true);
    try {
      const users = await createUserWithEmailAndPassword(auth, authEmail, form.password);

      // The stored email is the REAL inbox or null — never the synthetic
      // auth address (admins would mistake it for a contactable email).
      const user = {
        name,
        email: email || null,
        phone: normPhone,
        uid: users.user.uid,
        role: "user" as const,
        createdAt: serverTimestamp(),
        time: Timestamp.now(),
        date: new Date().toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
      };

      // Key the user doc by uid (doc.id === uid) so Firestore Security
      // Rules can read the caller's role via get(/user/$(uid)); rules
      // cannot run the where("uid","==") query the app used before.
      await setDoc(doc(fireDB, "user", users.user.uid), user);

      // createUserWithEmailAndPassword already signed them in — persist the
      // session for the header and land them home (no redundant re-login).
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "users",
          JSON.stringify({
            name: user.name,
            uid: user.uid,
            email: user.email ?? "",
            phone: normPhone,
            role: user.role,
          })
        );
      }

      setForm({ name: "", phone: "", email: "", password: "" });

      toast.success("Roʼyxatdan oʼtdingiz");

      setLoading(false);
      navigate.push("/");
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : "auth/unknown-error";
      toast.error(friendlySignupError(code, !email));
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {loading && <Loader />}

      <div className="w-full max-w-[420px]">
        <header className="mb-8">
          <h1 className="font-brand text-3xl font-bold tracking-tight text-[#1A1414]">
            Roʼyxatdan oʼtish
          </h1>
          <p className="mt-2 text-base text-[#575353]">
            Bepul hisob oching va megahome platformasidan foydalaning.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            userSignupFunction();
          }}
          className="space-y-5"
          noValidate
        >
          <div>
            <label
              htmlFor="signup-name"
              className="block text-sm font-medium text-[#1A1414]"
            >
              Toʼliq ism
            </label>
            <div className="relative mt-2">
              <FiUser
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9A9595]"
              />
              <input
                id="signup-name"
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Ism familiya"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="signup-phone"
              className="block text-sm font-medium text-[#1A1414]"
            >
              Telefon raqam
            </label>
            <div className="relative mt-2">
              <FiPhone
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9A9595]"
              />
              <input
                id="signup-phone"
                type="text"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+998 (__) ___-__-__"
                value={form.phone}
                onChange={handlePhoneChange}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-[#1A1414]"
            >
              Email manzil{" "}
              <span className="font-normal text-[#9A9595]">(ixtiyoriy)</span>
            </label>
            <div className="relative mt-2">
              <FiMail
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9A9595]"
              />
              <input
                id="signup-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="siz@megahome.uz"
                aria-describedby="signup-email-hint"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls}
              />
            </div>
            <p id="signup-email-hint" className="mt-2 text-sm text-[#575353]">
              Parolni email orqali tiklash uchun tavsiya etiladi
            </p>
          </div>

          <div>
            <label
              htmlFor="signup-password"
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
                id="signup-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder="Parol yarating"
                aria-describedby="signup-password-hint"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
            <p id="signup-password-hint" className="mt-2 text-sm text-[#575353]">
              Kamida 6 ta belgi
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-brand transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-safe:active:scale-[0.99]"
          >
            {loading ? "Yuborilmoqda..." : "Roʼyxatdan oʼtish"}
          </button>

          <div className="flex items-center gap-4 py-1" aria-hidden="true">
            <span className="h-px flex-1 bg-[#E5E1E1]" />
            <span className="text-sm text-[#575353]">yoki</span>
            <span className="h-px flex-1 bg-[#E5E1E1]" />
          </div>

          <GoogleAuthButton disabled={loading} />
        </form>

        <p className="mt-8 text-base text-[#575353]">
          Hisobingiz bormi?{" "}
          <Link
            href="/login"
            className="rounded font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Kirish
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default SignUpContent;
