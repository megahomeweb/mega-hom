'use client'
import CategoryDetail from "@/components/admin/CategoryDetail";
import ProductDetail from "@/components/admin/ProductDetail";
import Loader from "@/components/Loader";
import { userT } from "@/lib/types";
import useCategoryStore from "@/zustand/useCategoryStore";
import useProductStore from "@/zustand/useProductStore";
import { Popover, PopoverButton, PopoverPanel, Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const Admin = () => {
  const [user, setUser] = useState<userT | null>(null);
  const { products, fetchProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  const router = useRouter()

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userString = localStorage.getItem('users');
      if(userString && userString != undefined){
        setUser(JSON.parse(userString));
      }else {
        setTimeout(() => {
          handleRoute('/login');
        }, 200);
      }
      
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      handleRoute('/');
    }
  }, [user]);

  const handleRoute = (path:string) => {
    router.push(path);
  }
  
  if(!user){
    return <div className="flex items-center justify-center h-screen w-screen">
      <Loader />
    </div>
  }
  
  return (
    <>
      {/* Top */}
      <div className="mb-5 px-5 mt-5">
        <div className="flex items-center justify-between bg-pink-50 px-5 py-2 border border-pink-100 rounded-lg">
          <h1 className="text-2xl font-bold text-pink-500">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <Link className="font-medium text-pink-500 hover:text-pink-700" href={'/admin-dashboard/customers'}>
              Mijozlar
            </Link>
            <Link className="font-medium text-pink-500 hover:text-pink-700" href={'/admin-dashboard/orders'}>
              Orders
            </Link>
            {/* image  */}
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
                // transition
                anchor="bottom"
                className="divide-y w-52 bg-black -translate-x-5 divide-white/5 rounded-xl text-sm/6 [--anchor-gap:var(--spacing-5)] data-[closed]:-translate-y-1 data-[closed]:opacity-0 p-2"
              >
                <div className="block rounded-lg py-2 px-3">
                  <p className="font-semibold text-white">{user.name}</p>
                </div>
                <div className="block rounded-lg py-2 px-3 transition hover:bg-white/20 cursor-pointer">
                  <button className="font-semibold text-white">Log out</button>
                </div>
              </PopoverPanel>
            </Popover>
          </div>
        </div>
      </div>
      <TabGroup className="px-5">
        <TabList className="flex flex-wrap text-center justify-center">
          {/* Total Products */}
          <Tab className="p-4 cursor-pointer outline-none">
            <div className="flex items-center justify-center gap-4 border bg-pink-50 hover:bg-pink-100 border-pink-100 px-4 py-3 rounded-xl">
              <div className="text-pink-500 size-12 inline-block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={50}
                  height={50}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-shopping-basket"
                >
                  <path d="m5 11 4-7" />
                  <path d="m19 11-4-7" />
                  <path d="M2 11h20" />
                  <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4" />
                  <path d="m9 11 1 9" />
                  <path d="M4.5 15.5h15" />
                  <path d="m15 11-1 9" />
                </svg>
              </div>
              <div className="">
                <h2 className="title-font font-medium text-3xl text-pink-400 fonts1">
                  {products.length}
                </h2>
                <p className=" text-pink-500  font-bold">Total Products</p>
              </div>
            </div>
          </Tab>
          {/* Total Order  */}
          <Tab className="p-4 cursor-pointer outline-none">
            <div className="flex items-center justify-center gap-4 border bg-pink-50 hover:bg-pink-100 border-pink-100 px-4 py-3 rounded-xl">
              <div className="text-pink-500 w-12 h-12 inline-block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={50}
                  height={50}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-list-ordered"
                >
                  <line x1={10} x2={21} y1={6} y2={6} />
                  <line x1={10} x2={21} y1={12} y2={12} />
                  <line x1={10} x2={21} y1={18} y2={18} />
                  <path d="M4 6h1v4" />
                  <path d="M4 10h2" />
                  <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
                </svg>
              </div>
              <div>
                <h2 className="title-font font-medium text-3xl text-pink-400 fonts1">
                  {categories.length}
                </h2>
                <p className=" text-pink-500  font-bold">Total Category</p>
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
  );
};

export default Admin;
