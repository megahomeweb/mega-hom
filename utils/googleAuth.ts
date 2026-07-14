import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, fireDB } from "@/firebase/FirebaseConfig";

export interface AuthedUser {
  name: string;
  email: string;
  uid: string;
  role: string;
}

// Google sign-in / sign-up. Authenticates via Google, then ensures a UID-KEYED
// `user` doc exists. A brand-new Google account is created as role "user" — the
// SAME non-privileged default as email signup, so it can never self-escalate to
// admin (the Firestore create rule also enforces role == "user" for self-creates).
export async function signInWithGoogle(): Promise<AuthedUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  const u = cred.user;
  const ref = doc(fireDB, "user", u.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const d = snap.data();
    return {
      name: d.name ?? u.displayName ?? u.email ?? "Foydalanuvchi",
      email: u.email ?? d.email ?? "",
      uid: u.uid,
      role: d.role ?? "user",
    };
  }

  const newUser = {
    name: u.displayName ?? u.email ?? "Foydalanuvchi",
    email: u.email,
    uid: u.uid,
    role: "user",
    phone: null, // Google gives no phone; the CRM keys these accounts by uid until one is known
    createdAt: serverTimestamp(),
    time: Timestamp.now(),
    date: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
  };
  await setDoc(ref, newUser);
  return { name: newUser.name, email: u.email ?? "", uid: u.uid, role: "user" };
}
