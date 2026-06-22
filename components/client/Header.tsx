"use client"
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CloseIcon, MenuIcon } from "../icons";
import Image from "next/image";
import useCategoryStore from "@/zustand/useCategoryStore";
import Loader from "../Loader";
import SearchContent from "../SearchContent";
import AccountMenu from "./AccountMenu";

// Persistent storefront nav. Built ONLY from real, existing targets so the
// mobile menu is never an empty void even when Firestore returns 0 categories.
// "Mahsulotlar"/"Aloqa" point at in-page anchors that require id attributes
// on the matching landing sections (see pageAnchors note).
const PRIMARY_LINKS = [
  { href: "/", label: "Bosh sahifa" },
  { href: "/#mahsulotlar", label: "Mahsulotlar" },
  { href: "/#aloqa", label: "Aloqa" },
];

// Shared link styling for both the persistent links and the dynamic category
// links so the desktop bar and mobile panel stay visually identical.
const navLinkClass =
  "flex items-center justify-center gap-1 uppercase text-white transition-colors ease-in-out border-b border-transparent hover:border-white font-medium text-xs lg:text-sm p-3";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  // The landing page has its own hero + section flow, so the category/menu bar
  // is hidden there (per request) and kept on product/category pages where it
  // actually aids navigation.
  const isHome = pathname === "/";

  const { categories, fetchCategories, loading } = useCategoryStore();

  // Subscribe to the shared category listener. It is an idempotent module-scoped
  // singleton in the store (one onSnapshot for the whole app), so there is no
  // per-mount listener to tear down here.
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // The Header lives in the PERSISTENT client layout and never remounts on
  // client-side navigation, so close the panel whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes the open panel (mirrors SearchContent keyboard dismissal).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

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

        {!isHome && (
        <div className="relative bg-brand">
          <div className="max-w-7xl mx-auto px-4 min-h-[44px]">
            <div className="md:hidden flex items-center justify-between py-2">
              <span className="font-brand uppercase tracking-wide text-white" aria-hidden="true">
                Menyu
              </span>
              <button
                type="button"
                className="text-white"
                aria-label={menuOpen ? "Menyuni yopish" : "Menyuni ochish"}
                aria-expanded={menuOpen}
                aria-controls="mobil-menyu"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {menuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>

            {loading && categories.length === 0 && (
              <div className="flex items-center justify-center h-11">
                <Loader />
              </div>
            )}

            {/* Mobile: collapses via the grid-rows 0fr↔1fr trick driven by
                menuOpen (no magic-number max-height, no absolute overlap).
                Desktop (md+): always expanded as the horizontal category row. */}
            <nav
              id="mobil-menyu"
              aria-label="Asosiy menyu"
              className={`grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none md:grid-rows-[1fr] ${menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center md:flex-wrap justify-between">
                  {PRIMARY_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={navLinkClass}
                    >
                      <span>{item.label}</span>
                    </Link>
                  ))}

                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products/${category.id}`}
                      onClick={closeMenu}
                      className={navLinkClass}
                    >
                      <span>{category.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
        )}
      </div>
    </header>
  );
}

export default Header
