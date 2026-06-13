// Role model for the admin panel. Ranks are the single source of truth and are
// mirrored EXACTLY in firestore.rules (the real boundary — UI gating is only UX).
//
//   owner   (4) full control incl. managing admins
//   admin   (3) everything except managing owners; manages staff
//   manager (2) products, categories, customers, orders + status — NO staff mgmt
//   staff   (1) orders: view + change status only
//   user    (0) signed up but NOT granted any admin access (storefront only)

export type Role = "owner" | "admin" | "manager" | "staff" | "user";

export const ROLE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  staff: 1,
  user: 0,
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Egasi",
  admin: "Administrator",
  manager: "Menejer",
  staff: "Xodim",
  user: "Ruxsatsiz",
};

// Roles an admin can pick from the staff dropdown (owner is set out-of-band).
export const ASSIGNABLE_ROLES: Role[] = ["admin", "manager", "staff", "user"];

export const rankOf = (role?: string): number => ROLE_RANK[role ?? "user"] ?? 0;
export const isStaffPlus = (role?: string) => rankOf(role) >= ROLE_RANK.staff; // can enter admin
export const isManagerPlus = (role?: string) => rankOf(role) >= ROLE_RANK.manager;
export const isAdminPlus = (role?: string) => rankOf(role) >= ROLE_RANK.admin;
