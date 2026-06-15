import type { Metadata } from "next";
import AdminGuard from "@/components/admin/AdminGuard";
import OrderNotifier from "@/components/admin/OrderNotifier";
import AdminDock from "@/components/admin/AdminDock";

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
      {/* pb clears the mobile dock; dock itself is hidden on lg+ */}
      <div className="pb-24 lg:pb-0">{children}</div>
      <AdminDock />
    </AdminGuard>
  );
}
