import { ProductT } from "@/lib/types";
import useProductStore from "@/zustand/useProductStore";
import Image from "next/image";
import Link from "next/link";
import NoPhoto from "@/components/NoPhoto";
import React, { FocusEvent, KeyboardEvent, useEffect, useState } from "react";

const SearchContent = () => {
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filteredCommands, setFilteredCommands] = useState<ProductT[]>([]);
  const { products, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if(query.length >= 1){
      setFilteredCommands(
        products.filter((command) =>
          command.title.toLowerCase().includes(query.toLowerCase())
        )
      );
    }else{
      setFilteredCommands([])
    }
  }, [query, products]);

  const onClose = () => {
    setCommandPaletteOpen(false);
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleFocusOut = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onClose();
    }
  };

  return (
    <>
      <input
        type="text"
        placeholder="Mahsulot izlash"
        onFocus={() => setCommandPaletteOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "/") {
            e.preventDefault();
            setCommandPaletteOpen(true);
          }
        }}
        className="border border-gray-400 rounded-md w-full h-10 md:h-12 px-4 focus:ring-2 focus:ring-brand"
      />

      {isCommandPaletteOpen && <div
        className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-lg rounded-lg shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onBlur={handleFocusOut} // Close if focus is lost
        >
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Mahsulotlarni izlash..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Command Options */}
          <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {filteredCommands.map((command) => (
              <li
                key={command.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  onClose();
                  setQuery('')
                }}
              >
                <Link href={`/product/${command.id}`} key={command.id} className='flex items-center gap-4'>
                    <div className='rounded-lg w-12 h-12 relative overflow-hidden'>
                      {command.productImageUrl?.[0]?.url ? (
                        <Image fill alt={command.title} src={command.productImageUrl[0].url} className="w-full h-full object-cover" />
                      ) : (
                        <NoPhoto className="absolute inset-0" />
                      )}
                    </div>

                    <span className='text-xs'>
                      {command.title}
                    </span>
                  </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>}
    </>
  );
};

export default SearchContent;
