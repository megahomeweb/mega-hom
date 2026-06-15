"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import { FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import Loader from "../Loader";
import useStaffStore, { StaffUser } from "@/zustand/useStaffStore";
import { useRole } from "../admin/RoleContext";
import { ASSIGNABLE_ROLES, ROLE_LABELS, Role, isAdminPlus, rankOf } from "@/lib/roles";

const th = "h-12 px-4 lg:px-6 text-md font-bold border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100";
const td = "h-12 px-4 lg:px-6 text-md border-t border-l first:border-l-0 border-pink-100 text-slate-500";

// Plain-language capability matrix shown to the owner so granting a role is
// obvious at a glance. Mirrors lib/roles.ts + firestore.rules (Egasi = full,
// same as Administrator; Ruxsatsiz = no panel access at all).
const PERMS: { label: string; admin: boolean; manager: boolean; staff: boolean }[] = [
  { label: "Buyurtmalar — koʼrish va holatini oʼzgartirish", admin: true, manager: true, staff: true },
  { label: "Kassa (POS) — sotuv qabul qilish", admin: true, manager: true, staff: true },
  { label: "Mahsulot va kategoriyalar", admin: true, manager: true, staff: false },
  { label: "Mijozlar (CRM)", admin: true, manager: true, staff: false },
  { label: "Buyurtmani butunlay oʼchirish", admin: true, manager: false, staff: false },
  { label: "Xodimlarni boshqarish (rol berish)", admin: true, manager: false, staff: false },
];

const StaffContent = () => {
  const { staff, loading, fetchStaff, setRole, setDisabled, removeStaff } = useStaffStore();
  const me = useRole();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const myRank = rankOf(me?.role);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? staff.filter(
          (s) => (s.name ?? "").toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q)
        )
      : staff;
    return [...list].sort((a, b) => rankOf(b.role) - rankOf(a.role)); // highest rank first
  }, [staff, search]);

  // A row is manageable if I'm admin+, it's not me, and it's not above my rank.
  const canManage = (s: StaffUser) =>
    myRank >= 3 && s.id !== me?.uid && rankOf(s.role) <= myRank;
  const roleOptions = ASSIGNABLE_ROLES.filter((r) => rankOf(r) <= myRank);

  const changeRole = async (s: StaffUser, role: Role) => {
    try {
      await setRole(s.id, role);
      toast.success(`${s.name || s.email}: ${ROLE_LABELS[role]}`);
    } catch {
      toast.error("Rolni oʼzgartirib boʼlmadi (ruxsat yetarli emas)");
    }
  };
  const removeOne = async (s: StaffUser) => {
    if (typeof window !== "undefined" && !window.confirm(`${s.name || s.email} hisobini butunlay oʼchirilsinmi?`)) {
      return;
    }
    try {
      await removeStaff(s.id);
      toast.success("Xodim oʼchirildi");
    } catch {
      toast.error("Oʼchirib boʼlmadi (ruxsat yetarli emas)");
    }
  };
  const toggleDisabled = async (s: StaffUser) => {
    try {
      await setDisabled(s.id, !s.disabled);
      toast.success(s.disabled ? "Faollashtirildi" : "Oʼchirildi");
    } catch {
      toast.error("Amal bajarilmadi");
    }
  };

  if (!isAdminPlus(me?.role)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">
        Bu sahifa faqat administratorlar uchun.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link
        href="/admin-dashboard"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-pink-500 mb-3"
      >
        <GoArrowLeft className="text-xl" />
        <span>Admin panelga qaytish</span>
      </Link>
      <h1 className="text-xl font-bold text-pink-500">Xodimlar</h1>

      <div className="mt-3 mb-5 bg-pink-50 border border-pink-100 rounded-lg p-4">
        <p className="text-sm text-slate-600 mb-3">
          Yangi xodim avval{" "}
          <Link href="/sign-up" className="text-pink-600 font-semibold underline">
            /sign-up
          </Link>{" "}
          orqali roʼyxatdan oʼtsin — keyin shu yerda unga rol bering. Har bir rol nimaga ruxsat
          berishini quyida koʼring:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left font-semibold py-1.5 pr-3">Ruxsat</th>
                <th className="font-semibold px-2 w-28">Administrator</th>
                <th className="font-semibold px-2 w-24">Menejer</th>
                <th className="font-semibold px-2 w-20">Xodim</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {PERMS.map((p) => (
                <tr key={p.label} className="border-t border-pink-100/70">
                  <td className="py-1.5 pr-3">{p.label}</td>
                  {[p.admin, p.manager, p.staff].map((ok, i) => (
                    <td key={i} className="text-center">
                      {ok ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          <b>Egasi</b> — toʼliq huquq (administratorlarni ham boshqaradi). <b>Ruxsatsiz</b> — admin
          panelga umuman kira olmaydi (faqat saytdan xarid qiladi).
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Qidirish: ism yoki email..."
        className="w-full sm:max-w-sm px-3 py-2 border border-pink-200 rounded-lg outline-none focus:ring-1 focus:ring-pink-300 text-slate-700 placeholder-slate-400 mb-4"
      />

      {loading && staff.length === 0 && (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}

      {/* Mobile cards */}
      {visible.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {visible.map((s) => {
            const manage = canManage(s);
            const isMe = s.id === me?.uid;
            return (
              <div key={s.id} className={`rounded-xl border bg-white p-3 ${s.disabled ? "opacity-60 border-slate-200" : "border-pink-100"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">
                      {s.name || "—"} {isMe && <span className="text-xs text-pink-500">(Siz)</span>}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{s.email || "—"}</p>
                    {typeof s.date === "string" && <p className="text-[11px] text-slate-400 mt-0.5">{s.date}</p>}
                  </div>
                  {manage && (
                    <button onClick={() => removeOne(s)} title="Xodimni oʼchirish" className="text-red-400 hover:text-red-600 shrink-0">
                      <FiTrash2 className="text-lg" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  {manage ? (
                    <select
                      value={ASSIGNABLE_ROLES.includes(s.role as Role) ? (s.role as Role) : "user"}
                      onChange={(e) => changeRole(s, e.target.value as Role)}
                      className="flex-1 text-sm border border-pink-200 rounded-lg px-2 py-1.5 outline-none text-slate-700"
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex-1 text-sm text-slate-600">{ROLE_LABELS[(s.role as Role) ?? "user"] ?? s.role}</span>
                  )}
                  {manage ? (
                    <button
                      onClick={() => toggleDisabled(s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 ${
                        s.disabled ? "bg-gray-100 text-gray-500 border-gray-300" : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {s.disabled ? "Oʼchirilgan" : "Faol"}
                    </button>
                  ) : (
                    <span className={`text-xs font-semibold shrink-0 ${s.disabled ? "text-gray-400" : "text-green-600"}`}>
                      {s.disabled ? "Oʼchirilgan" : "Faol"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop table */}
      {visible.length > 0 && (
        <div className="hidden lg:block w-full overflow-x-auto">
          <table className="w-full text-left border-separate border-pink-100">
            <tbody>
              <tr>
                <th className={th}>№</th>
                <th className={th}>Ism</th>
                <th className={th}>Email</th>
                <th className={th}>Rol</th>
                <th className={th}>Holat</th>
                <th className={th}>Qoʼshilgan</th>
                <th className={th}></th>
              </tr>
              {visible.map((s, i) => {
                const manage = canManage(s);
                const isMe = s.id === me?.uid;
                return (
                  <tr key={s.id} className={s.disabled ? "opacity-60" : ""}>
                    <td className={td}>{i + 1}.</td>
                    <td className={`${td} font-medium text-slate-700`}>
                      {s.name || "—"} {isMe && <span className="text-xs text-pink-500">(Siz)</span>}
                    </td>
                    <td className={td}>{s.email || "—"}</td>
                    <td className={td}>
                      {manage ? (
                        <select
                          value={ASSIGNABLE_ROLES.includes(s.role as Role) ? (s.role as Role) : "user"}
                          onChange={(e) => changeRole(s, e.target.value as Role)}
                          className="text-sm border border-pink-200 rounded-md px-2 py-1 outline-none text-slate-700"
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-600">{ROLE_LABELS[(s.role as Role) ?? "user"] ?? s.role}</span>
                      )}
                    </td>
                    <td className={td}>
                      {manage ? (
                        <button
                          onClick={() => toggleDisabled(s)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            s.disabled
                              ? "bg-gray-100 text-gray-500 border-gray-300"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {s.disabled ? "Oʼchirilgan" : "Faol"}
                        </button>
                      ) : (
                        <span className={`text-xs font-semibold ${s.disabled ? "text-gray-400" : "text-green-600"}`}>
                          {s.disabled ? "Oʼchirilgan" : "Faol"}
                        </span>
                      )}
                    </td>
                    <td className={td}>{typeof s.date === "string" ? s.date : "—"}</td>
                    <td className={td}>
                      {manage && (
                        <button
                          onClick={() => removeOne(s)}
                          title="Xodimni oʼchirish"
                          className="text-red-500 hover:text-red-600"
                        >
                          <FiTrash2 className="text-lg" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StaffContent;
