"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import useCategoryStore from "@/zustand/useCategoryStore";

// Renders the REAL categories from Firestore (was hardcoded IDs before, which
// broke when categories changed). Every category becomes a tile linking to its
// listing page /products/<categoryId>. Icons + colors are cycled so newly
// added categories always render a proper, on-brand tile.
const ICON_POOL = [
  "/dishes.svg",
  "/decors.svg",
  "/appliances.svg",
  "/luggage.svg",
  "/safe.svg",
  "/chair.svg",
];
const COLOR_POOL = ["bg-yellow-500", "bg-red-400", "bg-pink-500", "bg-amber-500"];

const Populars = () => {
  const { categories, fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (!categories.length) return null;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <h2 className="text-3xl sm:text-4xl font-bold pb-5">Kategoriyalar</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {categories.map((cat, i) => (
          <Link
            key={cat.id}
            href={`/products/${cat.id}`}
            className={`flex items-center gap-3 sm:gap-5 rounded ${COLOR_POOL[i % COLOR_POOL.length]} hover:shadow-brand transition-all ease-in-out p-4 sm:p-5`}
          >
            <Image
              src={ICON_POOL[i % ICON_POOL.length]}
              width={64}
              height={64}
              alt=""
              className="w-12 sm:w-16 shrink-0"
            />
            <h3 className="text-white font-medium text-lg capitalize">{cat.name}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Populars;
