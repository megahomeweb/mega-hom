"use client";
import Link from "next/link";
import React, { useState } from "react";
import Loader from "../Loader";
import toast from "react-hot-toast";
import { Timestamp, doc, setDoc } from "firebase/firestore";
import { auth, fireDB } from "../../firebase/FirebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import GoogleAuthButton from "./GoogleAuthButton";
import AuthShell from "./AuthShell";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

type role = "admin" | "user";

export interface userI {
  name: string;
  email: string;
  password: string;
  role?: role;
}

const SignUpContent = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // navigate
  const navigate = useRouter();

  // User Signup State
  const [userSignup, setUserSignup] = useState<userI>({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const userSignupFunction = async () => {
    // validation
    if (
      userSignup.name === "" ||
      userSignup.email === "" ||
      userSignup.password === ""
    ) {
      return toast.error("Barcha maydonlarni toʼldiring");
    }

    setLoading(true);
    try {
      const users = await createUserWithEmailAndPassword(
        auth,
        userSignup.email,
        userSignup.password
      );

      // create user object
      const user = {
        name: userSignup.name,
        email: users.user.email,
        uid: users.user.uid,
        role: userSignup.role,
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
            email: user.email,
            role: user.role,
          })
        );
      }

      setUserSignup({
        name: "",
        email: "",
        password: "",
      });

      toast.success("Roʼyxatdan oʼtdingiz");

      setLoading(false);
      navigate.push("/");
    } catch (error: any) {
      toast.error(error.message);
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
                value={userSignup.name}
                onChange={(e) => {
                  setUserSignup({
                    ...userSignup,
                    name: e.target.value,
                  });
                }}
                className="block w-full rounded-xl border border-[#E5E1E1] bg-white py-3.5 pl-11 pr-4 text-base text-[#1A1414] placeholder-[#9A9595] outline-none transition-colors focus:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-[#1A1414]"
            >
              Email manzil
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
                value={userSignup.email}
                onChange={(e) => {
                  setUserSignup({
                    ...userSignup,
                    email: e.target.value,
                  });
                }}
                className="block w-full rounded-xl border border-[#E5E1E1] bg-white py-3.5 pl-11 pr-4 text-base text-[#1A1414] placeholder-[#9A9595] outline-none transition-colors focus:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1"
              />
            </div>
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
                value={userSignup.password}
                onChange={(e) => {
                  setUserSignup({
                    ...userSignup,
                    password: e.target.value,
                  });
                }}
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
