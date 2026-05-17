"use client"
import { useEffect, useState } from "react";
import Link from "next/link";
import { HumburgerIcon, XIcon } from "../icons";
import Image from "next/image";
import useCategoryStore from "@/zustand/useCategoryStore";
import Loader from "../Loader";
import SearchContent from "../SearchContent";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const { categories, fetchCategories } = useCategoryStore()

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <header>
      <div className="w-full bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-5 py-1 md:py-0 xl:px-0 px-4 my-2">
          <Link href="/" className="relative flex justify-center p-4 w-40 sm:w-48">
            <Image className="absolute object-cover" fill src="/megahome-text.png" alt="Logo" />
          </Link>

          <div className="max-w-md w-full">
            <SearchContent />
          </div>

          <Link
            href="/login"
            aria-label="Login / Kirish"
            className="shrink-0 inline-flex items-center gap-2 rounded-md border border-brand text-brand hover:bg-brand hover:text-white transition-colors px-3 py-2 text-sm font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" x2="3" y1="12" y2="12" />
            </svg>
            <span className="hidden sm:inline">Kirish</span>
          </Link>
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
            {categories.length == 0 && <div className="flex items-center justify-center h-11">
              <Loader />
            </div>}
            <div className={`absolute md:static top-12 left-0 w-full bg-brand md:max-h-none overflow-hidden transition-all ease-in-out duration-200 z-10 ${menuOpen ? "max-h-64" : "max-h-0"}`} >
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                {categories.slice(0, -1).map((category) => (
                  <Link
                    key={category.id}
                    href={`/products/${category.id}`}
                    className="flex items-center justify-center gap-1 uppercase text-white transition-all ease-in-out hover:text-white/70 border-b border-transparent hover:border-b hover:border-white font-medium text-xs lg:text-sm p-3"
                  >
                    <span>{category.name}</span>
                  </Link>
                ))}
                <Link
                    href='https://www.kursiy.uz/'
                    target="_blank"
                    className="flex items-center justify-center gap-1 uppercase text-white transition-all ease-in-out hover:text-white/70 border-b border-transparent hover:border-b hover:border-white font-medium text-xs lg:text-sm p-3"
                  >
                    <span>Kreslolar</span>
                  </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header