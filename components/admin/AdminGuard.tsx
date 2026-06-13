"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { auth, fireDB } from "@/firebase/FirebaseConfig";
import Loader from "@/components/Loader";
import { Role, isStaffPlus } from "@/lib/roles";
import { AdminProfile, RoleContext } from "./RoleContext";

type Status = "checking" | "ok" | "redirecting";

// Gates every admin page: requires an authenticated user whose UID-keyed user
// doc grants a staff-tier role (staff+) and isn't disabled. Provides the
// verified profile to descendants via RoleContext so they can gate by role.
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("redirecting");
        router.replace("/login");
        return;
      }
      try {
        // Prefer the uid-keyed doc; fall back to the legacy uid-field query and
        // self-heal to a uid-keyed doc (rules can't run where-queries).
        const directRef = doc(fireDB, "user", user.uid);
        const directSnap = await getDoc(directRef);
        let data = directSnap.exists() ? directSnap.data() : null;
        if (!data) {
          const legacy = await getDocs(
            query(collection(fireDB, "user"), where("uid", "==", user.uid))
          );
          if (!legacy.empty) {
            data = legacy.docs[0].data();
            try {
              await setDoc(directRef, data, { merge: true });
            } catch (healErr) {
              console.warn("AdminGuard self-heal skipped:", healErr);
            }
          }
        }

        const role = (data?.role ?? "user") as Role;
        if (data && isStaffPlus(role) && data.disabled !== true) {
          setProfile({
            uid: user.uid,
            name: data.name ?? user.email ?? "",
            email: data.email ?? user.email ?? "",
            role,
          });
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

  if (status !== "ok" || !profile) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <Loader />
      </div>
    );
  }
  return <RoleContext.Provider value={profile}>{children}</RoleContext.Provider>;
};

export default AdminGuard;
