"use client"
import { useEffect, useState } from "react";
import Link from "next/link";
import { HumburgerIcon, XIcon } from "../icons";
import Image from "next/image";
import useCategoryStore from "@/zustand/useCategoryStore";
import Loader from "../Loader";
import SearchContent from "../SearchContent";
import AccountMenu from "./AccountMenu";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const { categories, fetchCategories, loading } = useCategoryStore()

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <header>
      <div className="w-full bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-5 py-1 md:py-0 xl:px-0 px-4 my-2">
          <Link href="/" className="relative block w-36 sm:w-44 h-12 sm:h-14 shrink-0">
            <Image className="object-contain" fill sizes="176px" priority src="/megahome-text.png" alt="megahome" />
          </Link>

          <div className="max-w-md w-full">
            <SearchContent />
          </div>

          <AccountMenu />
        </div>

        <div className="relative bg-brand">
          <div className="max-w-7xl mx-auto px-4">
            <div className="md:hidden flex items-center justify-between py-2">
              <span className="text-white">MENU</span>
              <button type="button" className="text-white" onClick={() => setMenuOpen(!menuOpen)} >
                {menuOpen ? (
                  <HumburgerIcon />
                ) : (
                  <XIcon />
                )}
              </button>
            </div>
            {loading && categories.length === 0 && <div className="flex items-center justify-center h-11">
              <Loader />
            </div>}
            <div className={`absolute md:static top-12 left-0 w-full bg-brand md:max-h-none overflow-hidden transition-all ease-in-out duration-200 z-10 ${menuOpen ? "max-h-64" : "max-h-0"}`} >
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products/${category.id}`}
                    className="flex items-center justify-center gap-1 uppercase text-white transition-all ease-in-out hover:text-white/70 border-b border-transparent hover:border-b hover:border-white font-medium text-xs lg:text-sm p-3"
                  >
                    <span>{category.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header