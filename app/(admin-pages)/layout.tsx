import type { Metadata } from "next";
import AdminGuard from "@/components/admin/AdminGuard";
import OrderNotifier from "@/components/admin/OrderNotifier";

export const metadata: Metadata = {
  title: "Mega Home — Admin panel",
  description: "Mega Home administrator dashboard",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminGuard>
      <OrderNotifier />
      {children}
    </AdminGuard>
  );
}
