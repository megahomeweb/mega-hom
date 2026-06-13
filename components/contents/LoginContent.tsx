"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, fireDB } from "../../firebase/FirebaseConfig";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import Loader from "../Loader";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StoredUser {
  name: string;
  uid: string;
  email: string;
  role: "admin" | "user";
  date?: string;
}

const friendlyAuthError = (code: string): string => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email yoki parol noto'g'ri";
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
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) {
      toast.error("Email va parolni kiriting");
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

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
            name: cred.user.displayName || cred.user.email || "User",
            uid: cred.user.uid,
            email: cred.user.email || "",
            role: "user",
          };
          toast.error(
            "Hisob topildi, lekin Firestore'da 'user' hujjati yo'q. Admin uchun rol qo'lda qo'shilishi kerak."
          );
        } else {
          stored = {
            name: data.name || cred.user.email || "User",
            uid: data.uid || cred.user.uid,
            email: data.email || cred.user.email || "",
            role: data.role === "admin" ? "admin" : "user",
          };
        }
      } catch (firestoreErr) {
        // Firestore rules or network — don't lock the user out of their account.
        console.error("Firestore profile lookup failed:", firestoreErr);
        toast.error(
          "Profil ma'lumotini olishda xatolik (Firestore qoidalari yoki tarmoq)"
        );
        stored = {
          name: cred.user.email || "User",
          uid: cred.user.uid,
          email: cred.user.email || "",
          role: "user",
        };
      }

      localStorage.setItem("users", JSON.stringify(stored));
      toast.success("Muvaffaqiyatli kirdingiz");
      setForm({ email: "", password: "" });

      router.push(stored.role === "admin" ? "/admin-dashboard" : "/");
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
    <div className="flex justify-center items-center min-h-screen bg-body px-4">
      {loading && <Loader />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
        className="login_Form bg-white w-full max-w-sm px-8 py-7 border border-gray-100 rounded-xl shadow-lg"
      >
        <h2 className="text-center text-2xl font-bold text-brand mb-1">
          Kirish
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Hisobingizga kiring
        </p>

        <div className="mb-3">
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email manzil"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="bg-white border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand px-3 py-2 w-full rounded-md outline-none placeholder-gray-400"
          />
        </div>

        <div className="mb-5">
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Parol"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="bg-white border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand px-3 py-2 w-full rounded-md outline-none placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-brand hover:bg-brand/90 disabled:opacity-60 w-full text-white py-2.5 font-semibold rounded-md transition-colors"
        >
          {loading ? "Kirilmoqda..." : "Kirish"}
        </button>

        <p className="text-sm text-gray-600 mt-5 text-center">
          Hisobingiz yo&apos;qmi?{" "}
          <Link className="text-brand font-semibold" href="/sign-up">
            Ro&apos;yxatdan o&apos;ting
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginContent;
