"use client";
import { useEffect } from "react";
import Card from "./Card";
import Loader from "../Loader";
import useProductStore from "@/zustand/useProductStore";

// The full catalog on the homepage. Before this, a product only appeared if it
// was flagged New/Best (those carousels) or found via search — so plain
// products were effectively invisible to customers. This grid shows them all.
const AllProducts = () => {
  const { products, loading, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader />
      </div>
    );
  }

  const visible = products.filter((p) => !p.isHidden);
  if (!visible.length) return null;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <h2 className="text-3xl sm:text-4xl font-bold pb-5">Barcha mahsulotlar</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 lg:gap-5">
        {visible.map((card) => (
          <Card
            key={card.id}
            img={card.productImageUrl}
            title={card.title}
            description={card.description}
            currentPrice={card.price}
            href={`/product/${card.id}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AllProducts;
