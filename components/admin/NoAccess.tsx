"use client";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import { FiLock } from "react-icons/fi";
import { useRole } from "./RoleContext";
import { Role, ROLE_LABELS } from "@/lib/roles";

// Consistent "you don't have access" screen for admin sub-pages whose minimum
// role is above the viewer's. AdminGuard already restricts the whole area to
// staff+; this covers the per-page minimum so a lower role gets a clean message
// instead of a form that the Firestore rules will only reject on submit.
// The rules remain the real boundary — this is UX.
const NoAccess = ({ min }: { min: Role }) => {
  const me = useRole();
  return (
    <div className="max-w-md mx-auto text-center bg-white border border-brand-100 rounded-xl p-8 mt-16 shadow-sm">
      <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <FiLock className="text-xl" />
      </div>
      <h2 className="text-lg font-bold text-slate-700">Ruxsat yoʼq</h2>
      <p className="text-slate-500 mt-1 text-sm">
        Bu sahifa kamida <b>{ROLE_LABELS[min]}</b> roli uchun. Sizning rolingiz:{" "}
        <b>{ROLE_LABELS[(me?.role as Role) ?? "user"]}</b>.
      </p>
      <Link
        href="/admin-dashboard"
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 text-white font-semibold hover:bg-brand-600"
      >
        <GoArrowLeft /> Admin panelga qaytish
      </Link>
    </div>
  );
};

export default NoAccess;
