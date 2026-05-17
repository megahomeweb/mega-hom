import type { Metadata } from "next";
import AdminGuard from "@/components/admin/AdminGuard";

export const metadata: Metadata = {
  title: "Mega Home — Admin panel",
  description: "Mega Home administrator dashboard",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminGuard>{children}</AdminGuard>;
}
