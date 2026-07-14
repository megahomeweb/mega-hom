'use client'
import CategoryDetail from "@/components/admin/CategoryDetail";
import ProductDetail from "@/components/admin/ProductDetail";
import DashboardKPIs from "@/components/admin/DashboardKPIs";
import LowStockCard from "@/components/admin/LowStockCard";
import TopSellers from "@/components/admin/TopSellers";
import MeshBackdrop from "@/components/MeshBackdrop";
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
    <div className="brand-mesh min-h-screen pb-10">
      {/* Top */}
      <div className="mb-5 px-5 pt-5">
        <div className="relative overflow-hidden rounded-xl shadow-lg shadow-brand/20">
          <MeshBackdrop colors={["#C21A1A", "#9E1414", "#5B0D0D", "#7A1010", "#C21A1A"]} speed={0.5} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#5B0D0D]/45 via-transparent to-[#5B0D0D]/45" />
          <div className="relative z-10 flex items-center justify-between text-white px-5 py-3">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="hidden lg:flex items-center gap-4">
            <Link
              className="font-medium text-white bg-white/15 hover:bg-white/25 border border-white/30 rounded-lg px-3 py-1.5 transition-colors"
              href={'/'}
              title="Profildan chiqmagan holda doʼkonga qaytish"
            >
              ← Doʼkon
            </Link>
            <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/pos'}>
              Kassa
            </Link>
            {canStaff && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/staff'}>
                Xodimlar
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/customers'}>
                Mijozlar
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/inventory'}>
                Ombor
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/expenses'}>
                Xarajatlar
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/analytics'}>
                Tahlil
              </Link>
            )}
            <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/orders'}>
              Buyurtmalar
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
                <div className="block rounded-lg transition hover:bg-white/20">
                  <Link href="/" className="block py-2 px-3 font-semibold text-white">
                    Doʼkonga qaytish
                  </Link>
                </div>
                <div className="block rounded-lg py-2 px-3 transition hover:bg-white/20 cursor-pointer">
                  <button onClick={handleLogout} className="font-semibold text-white">
                    Chiqish
                  </button>
                </div>
              </PopoverPanel>
            </Popover>
          </div>
          </div>
        </div>
      </div>

      {canCatalog ? (
        <>
          <DashboardKPIs />
          <LowStockCard />
          <TopSellers />
          <TabGroup className="px-5">
          <TabList className="flex flex-wrap gap-4 justify-center py-2">
            {/* Mahsulotlar — tap to view the product list */}
            <Tab className="p-1 outline-none cursor-pointer">
              {({ selected }: { selected: boolean }) => (
                <div className={`shiny-border ${selected ? "shiny-border--active" : ""} transition-transform duration-200 hover:-translate-y-0.5`}>
                  <div className={`flex items-center gap-4 px-5 py-3.5 rounded-[14px] transition-colors ${selected ? "bg-brand" : "bg-white hover:bg-brand-50"}`}>
                    <div className={`size-11 inline-flex items-center justify-center rounded-xl ${selected ? "bg-white/15" : "bg-brand-50"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={selected ? "text-white" : "text-brand-500"}>
                        <path d="m5 11 4-7" /><path d="m19 11-4-7" /><path d="M2 11h20" /><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4" /><path d="m9 11 1 9" /><path d="M4.5 15.5h15" /><path d="m15 11-1 9" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h2 className={`font-bold text-3xl leading-none ${selected ? "text-white" : "text-brand-500"}`}>{products.length}</h2>
                      <p className={`text-sm font-semibold mt-1 ${selected ? "text-white/90" : "text-slate-500"}`}>Mahsulotlar</p>
                    </div>
                  </div>
                </div>
              )}
            </Tab>
            {/* Kategoriyalar — tap to view categories */}
            <Tab className="p-1 outline-none cursor-pointer">
              {({ selected }: { selected: boolean }) => (
                <div className={`shiny-border ${selected ? "shiny-border--active" : ""} transition-transform duration-200 hover:-translate-y-0.5`}>
                  <div className={`flex items-center gap-4 px-5 py-3.5 rounded-[14px] transition-colors ${selected ? "bg-brand" : "bg-white hover:bg-brand-50"}`}>
                    <div className={`size-11 inline-flex items-center justify-center rounded-xl ${selected ? "bg-white/15" : "bg-brand-50"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={selected ? "text-white" : "text-brand-500"}>
                        <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h2 className={`font-bold text-3xl leading-none ${selected ? "text-white" : "text-brand-500"}`}>{categories.length}</h2>
                      <p className={`text-sm font-semibold mt-1 ${selected ? "text-white/90" : "text-slate-500"}`}>Kategoriyalar</p>
                    </div>
                  </div>
                </div>
              )}
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
          <div className="max-w-md mx-auto text-center bg-brand-50 border border-brand-100 rounded-xl p-8 mt-10">
            <h2 className="text-lg font-bold text-brand-600 mb-2">Salom, {me?.name}!</h2>
            <p className="text-slate-600 mb-4">Siz xodim sifatida kassa va buyurtmalar bilan ishlaysiz.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/admin-dashboard/pos"
                className="inline-block px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600"
              >
                Kassa (POS)
              </Link>
              <Link
                href="/admin-dashboard/orders"
                className="inline-block px-5 py-2.5 bg-white border border-brand-200 text-brand-600 font-semibold rounded-lg hover:bg-brand-50"
              >
                Buyurtmalar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
