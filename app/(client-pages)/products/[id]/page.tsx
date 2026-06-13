"use client"
import Card from '@/components/client/Card';
import { IconChevron } from '@/components/icons';
import Loader from '@/components/Loader';
import { ProductT } from '@/lib/types';
import useCategoryStore from '@/zustand/useCategoryStore';
import useProductStore from '@/zustand/useProductStore';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import React, { useEffect, useState } from 'react'

const Products = ({ params }: { params: Promise<{ id: string }> }) => {
  const [projectId, setProjectId] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const { category, fetchSingleCategory } = useCategoryStore()
  const { products, fetchProducts } = useProductStore();

  // pagination
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const [paginatedProducts, setPaginatedProducts] = useState<ProductT[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 8; // Number of products per page
  
  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setProjectId(id)
    }
    getId()
  }, [params])
 
  useEffect(() => {
    fetchSingleCategory(projectId);
    fetchProducts()
  }, [fetchSingleCategory, fetchProducts, projectId]);

  useEffect(() => {
    let filtered = products.filter(
      (product) => product.category === category?.name && !product.isHidden
    );

    // Apply subcategory filter if needed
    if (selectedSubCategory && selectedSubCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.subCategory === selectedSubCategory
      );
    }

    // Update pagination state
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedProducts(filtered.slice(startIndex, endIndex));
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
  }, [products, selectedSubCategory, currentPage, category]);
  
  const handleCategoryChange = (category: string) => {
    setSelectedSubCategory(category);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if(category == null){
    return <div className="flex items-center justify-center h-40">
      <Loader />
    </div>
  }
  
  return (
    <div className="max-w-7xl mx-auto pt-4 px-4 sm:px-6">
      <div className="pb-10">
        <h2 className="text-3xl sm:text-4xl font-bold pb-5 capitalize">{category.name}</h2>
        <TabGroup>
          <TabList className="flex items-center gap-3 flex-wrap pb-5">
            <Tab className={`rounded-md transition-all ease-in-out py-1 px-4 capitalize outline-none ${
              selectedSubCategory === "all"
                ? "bg-brand text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => handleCategoryChange("all")}>
              All
            </Tab>
            {category.subcategory.map((c,id) => (
              <Tab
                key={id}
                className={`rounded-md transition-all ease-in-out py-1 px-4 capitalize outline-none ${
                  selectedSubCategory === c
                    ? "bg-brand text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                onClick={() => handleCategoryChange(c)}
              >
                {c}
              </Tab>
            ))}
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 lg:gap-5">
                {paginatedProducts.map((card) => (
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
            </TabPanel>
            {category.subcategory.map((c, idx) => (
              <TabPanel key={idx}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 lg:gap-5">
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((card) => (
                      <Card
                        key={card.id}
                        img={card.productImageUrl}
                        title={card.title}
                        description={card.description}
                        currentPrice={card.price}
                        href={`/product/${card.id}`}
                      />
                    ))
                  ) : (
                    <div className="flex items-center justify-center uppercase col-span-4 w-full h-28">
                      No products
                    </div>
                  )}
                </div>
              </TabPanel>
            ))}
          </TabPanels>
        </TabGroup>
      </div>

      {/* Pagination */}
      {products.length > itemsPerPage && <div className="flex justify-center mt-4">
        <nav
          className="isolate inline-flex -space-x-px rounded-md shadow-sm"
          aria-label="Pagination"
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${
              currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Previous</span>
            <span className="rotate-90">
              <IconChevron aria-hidden="true" />
            </span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => handlePageChange(i + 1)}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                currentPage === i + 1
                  ? "bg-red-600 text-white"
                  : "text-gray-900 hover:bg-gray-50"
              } ring-1 ring-inset ring-gray-300`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${
              currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Next</span>
            <span className="-rotate-90">
              <IconChevron aria-hidden="true" />
            </span>
          </button>
        </nav>
      </div>}
    </div>
  )
}

export default Products