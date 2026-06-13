"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
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
        // Prefer the uid-keyed user doc (doc.id === uid). Fall back to the
        // legacy auto-id doc found by the uid field, and self-heal it into a
        // uid-keyed doc so future reads — and Firestore Security Rules — can
        // resolve the role directly (rules cannot run where-queries).
        const directRef = doc(fireDB, "user", user.uid);
        const directSnap = await getDoc(directRef);
        let profile = directSnap.exists() ? directSnap.data() : null;

        if (!profile) {
          const legacy = await getDocs(
            query(collection(fireDB, "user"), where("uid", "==", user.uid))
          );
          if (!legacy.empty) {
            profile = legacy.docs[0].data();
            try {
              await setDoc(directRef, profile, { merge: true });
            } catch (healErr) {
              console.warn("AdminGuard self-heal skipped:", healErr);
            }
          }
        }

        if (profile && profile.role === "admin" && profile.disabled !== true) {
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
