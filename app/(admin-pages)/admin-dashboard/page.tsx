'use client'
import CategoryDetail from "@/components/admin/CategoryDetail";
import ProductDetail from "@/components/admin/ProductDetail";
import DashboardKPIs from "@/components/admin/DashboardKPIs";
import { useRole } from "@/components/admin/RoleContext";
import { ROLE_LABELS, Role, isAdminPlus, isManagerPlus } from "@/lib/roles";
import { auth } from "@/firebase/FirebaseConfig";
import { signOut } from "firebase/auth";
import useCategoryStore from "@/zustand/useCategoryStore";
import useProductStore from "@/zustand/useProductStore";
import { Popover, PopoverButton, PopoverPanel, Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const Admin = () => {
  const me = useRole();
  const { products, fetchProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("logout failed", e);
    }
    if (typeof window !== "undefined") localStorage.removeItem("users");
    router.push("/login");
  };

  const canCatalog = isManagerPlus(me?.role);
  const canStaff = isAdminPlus(me?.role);

  return (
    <>
      {/* Top */}
      <div className="mb-5 px-5 mt-5">
        <div className="flex items-center justify-between bg-pink-50 px-5 py-2 border border-pink-100 rounded-lg">
          <h1 className="text-2xl font-bold text-pink-500">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link className="font-medium text-pink-500 hover:text-pink-700" href={'/admin-dashboard/pos'}>
              Kassa
            </Link>
            {canStaff && (
              <Link className="font-medium text-pink-500 hover:text-pink-700" href={'/admin-dashboard/staff'}>
                Xodimlar
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-pink-500 hover:text-pink-700" href={'/admin-dashboard/customers'}>
                Mijozlar
              </Link>
            )}
            <Link className="font-medium text-pink-500 hover:text-pink-700" href={'/admin-dashboard/orders'}>
              Orders
            </Link>
            <Popover className="relative lg:ml-5">
              <PopoverButton className="flex items-center outline-none">
                <Image
                  width={56}
                  height={56}
                  className="size-14"
                  src="https://cdn-icons-png.flaticon.com/128/2202/2202112.png"
                  alt=""
                />
              </PopoverButton>
              <PopoverPanel
                anchor="bottom"
                className="divide-y w-52 bg-black -translate-x-5 divide-white/5 rounded-xl text-sm/6 [--anchor-gap:var(--spacing-5)] data-[closed]:-translate-y-1 data-[closed]:opacity-0 p-2"
              >
                <div className="block rounded-lg py-2 px-3">
                  <p className="font-semibold text-white">{me?.name}</p>
                  <p className="text-xs text-white/60">{ROLE_LABELS[(me?.role as Role) ?? "user"]}</p>
                </div>
                <div className="block rounded-lg py-2 px-3 transition hover:bg-white/20 cursor-pointer">
                  <button onClick={handleLogout} className="font-semibold text-white">
                    Log out
                  </button>
                </div>
              </PopoverPanel>
            </Popover>
          </div>
        </div>
      </div>

      {canCatalog ? (
        <>
          <DashboardKPIs />
          <TabGroup className="px-5">
          <TabList className="flex flex-wrap text-center justify-center">
            {/* Total Products */}
            <Tab className="p-4 cursor-pointer outline-none">
              <div className="flex items-center justify-center gap-4 border bg-pink-50 hover:bg-pink-100 border-pink-100 px-4 py-3 rounded-xl">
                <div className="text-pink-500 size-12 inline-block">
                  <svg xmlns="http://www.w3.org/2000/svg" width={50} height={50} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-basket">
                    <path d="m5 11 4-7" /><path d="m19 11-4-7" /><path d="M2 11h20" /><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4" /><path d="m9 11 1 9" /><path d="M4.5 15.5h15" /><path d="m15 11-1 9" />
                  </svg>
                </div>
                <div>
                  <h2 className="title-font font-medium text-3xl text-pink-400 fonts1">{products.length}</h2>
                  <p className="text-pink-500 font-bold">Total Products</p>
                </div>
              </div>
            </Tab>
            {/* Total Category */}
            <Tab className="p-4 cursor-pointer outline-none">
              <div className="flex items-center justify-center gap-4 border bg-pink-50 hover:bg-pink-100 border-pink-100 px-4 py-3 rounded-xl">
                <div className="text-pink-500 w-12 h-12 inline-block">
                  <svg xmlns="http://www.w3.org/2000/svg" width={50} height={50} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid">
                    <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                </div>
                <div>
                  <h2 className="title-font font-medium text-3xl text-pink-400 fonts1">{categories.length}</h2>
                  <p className="text-pink-500 font-bold">Total Category</p>
                </div>
              </div>
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel><ProductDetail /></TabPanel>
            <TabPanel><CategoryDetail /></TabPanel>
          </TabPanels>
          </TabGroup>
        </>
      ) : (
        <div className="px-5">
          <div className="max-w-md mx-auto text-center bg-pink-50 border border-pink-100 rounded-xl p-8 mt-10">
            <h2 className="text-lg font-bold text-pink-600 mb-2">Salom, {me?.name}!</h2>
            <p className="text-slate-600 mb-4">Siz xodim sifatida kassa va buyurtmalar bilan ishlaysiz.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/admin-dashboard/pos"
                className="inline-block px-5 py-2.5 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600"
              >
                Kassa (POS)
              </Link>
              <Link
                href="/admin-dashboard/orders"
                className="inline-block px-5 py-2.5 bg-white border border-pink-200 text-pink-600 font-semibold rounded-lg hover:bg-pink-50"
              >
                Buyurtmalar
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Admin;
