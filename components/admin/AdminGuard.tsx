"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, fireDB } from "@/firebase/FirebaseConfig";
import Loader from "@/components/Loader";

type Status = "checking" | "ok" | "redirecting";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("redirecting");
        router.replace("/login");
        return;
      }

      try {
        const snap = await getDocs(
          query(collection(fireDB, "user"), where("uid", "==", user.uid))
        );
        const profile = snap.empty ? null : snap.docs[0].data();
        if (profile && profile.role === "admin") {
          setStatus("ok");
        } else {
          setStatus("redirecting");
          router.replace("/");
        }
      } catch (err) {
        console.error("AdminGuard profile check failed:", err);
        setStatus("redirecting");
        router.replace("/login");
      }
    });
    return () => unsub();
  }, [router]);

  if (status !== "ok") {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <Loader />
      </div>
    );
  }
  return <>{children}</>;
};

export default AdminGuard;
