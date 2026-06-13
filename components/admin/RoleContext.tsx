"use client";
import { createContext, useContext } from "react";
import { Role } from "@/lib/roles";

// The verified admin profile, provided by AdminGuard after it reads the user
// doc. Components use useRole() to gate UI by role (the Firestore rules are the
// real boundary; this is only UX).
export interface AdminProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
}

export const RoleContext = createContext<AdminProfile | null>(null);
export const useRole = (): AdminProfile | null => useContext(RoleContext);
