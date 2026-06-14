"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Loader from "../Loader";
import { CiEdit } from "react-icons/ci";
import { MdDeleteForever } from "react-icons/md";
import { BsQrCode } from "react-icons/bs";
import { FiCopy, FiLink, FiBox } from "react-icons/fi";
import useProductStore from "@/zustand/useProductStore";
import toast, { Toast } from "react-hot-toast";
import { ProductT } from "@/lib/types";
import { deleteObject, listAll, ref } from "firebase/storage";
import { Timestamp, addDoc, collection, doc, writeBatch } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { FormattedPrice } from "@/utils";
import { fireDB, fireStorage } from "@/firebase/FirebaseConfig";
import Image from "next/image";
import ProductRow from "./ProductRow";
import StockMovementModal from "./StockMovementModal";
import ProductImportExport from "./ProductImportExport";
import ProductQRCode from "./ProductQRCode";
import NoPhoto from "@/components/NoPhoto";
import { productUrl } from "@/lib/site";

const th =
  "h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100";
const td =
  "h-12 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 ";
const chip =
  "px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-pink-200 text-pink-600 hover:bg-pink-100";

const ProductDetail = () => {
  const { products, loading, fetchProducts, deleteProduct, bulkPatch, patchProduct } = useProductStore();
  const [qrProduct, setQrProduct] = useState<ProductT | null>(null);
  const [stockProduct, setStockProduct] = useState<ProductT | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceMode, setPriceMode] = useState<"inc" | "dec" | "set">("inc");
  const [priceValue, setPriceValue] = useState("");
  const skipSave = useRef(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const visible = products.filter((p) => {
    if (pendingDelete.has(p.id)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (p.title ?? "").toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q);
  });
  const allSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));
  const selectedProducts = products.filter((p) => selected.has(p.id));

  /* ------------------------------- selection ------------------------------- */
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleSelectAll = () =>
    setSelected(() => (allSelected ? new Set() : new Set(visible.map((p) => p.id))));

  /* --------------------------------- links --------------------------------- */
  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(productUrl(id));
      toast.success("Havola nusxalandi");
    } catch {
      toast.error("Nusxalab boʼlmadi");
    }
  };

  /* ------------------------- delete (with 5s undo) ------------------------- */
  const deleteWithUndo = (items: ProductT[]) => {
    if (!items.length) return;
    const ids = items.map((i) => i.id);
    setPendingDelete((prev) => new Set([...prev, ...ids]));
    setSelected(new Set());
    let cancelled = false;
    const unpend = () =>
      setPendingDelete((prev) => {
        const n = new Set(prev);
        ids.forEach((id) => n.delete(id));
        return n;
      });
    const timer = setTimeout(async () => {
      if (cancelled) return;
      for (const item of items) {
        try {
          if (item.storageFileId) {
            const folder = await listAll(ref(fireStorage, `products/${item.storageFileId}`));
            await Promise.all(folder.items.map((r) => deleteObject(r)));
          }
          await deleteProduct(item.id);
        } catch (err) {
          console.error("Delete failed:", err);
        }
      }
      unpend();
    }, 5000);
    toast(
      (t: Toast) => (
        <span className="flex items-center gap-3">
          {items.length === 1 ? "Mahsulot oʼchirildi" : `${items.length} mahsulot oʼchirildi`}
          <button
            onClick={() => {
              cancelled = true;
              clearTimeout(timer);
              unpend();
              toast.dismiss(t.id);
            }}
            className="font-semibold text-pink-600 underline"
          >
            Bekor qilish
          </button>
        </span>
      ),
      { duration: 5000 }
    );
  };

  /* ------------------------------ bulk actions ----------------------------- */
  const bulkSetFlag = async (data: Partial<ProductT>, label: string) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      await bulkPatch(ids, data);
      toast.success(`${ids.length} mahsulot: ${label}`);
      setSelected(new Set());
    } catch {
      toast.error("Amal bajarilmadi");
    }
  };

  const applyPriceChange = async () => {
    const val = parseFloat(priceValue);
    if (isNaN(val)) return toast.error("Qiymat notoʼgʼri");
    const targets = selectedProducts;
    if (!targets.length) return;
    const batch = writeBatch(fireDB);
    for (const p of targets) {
      let np = p.price;
      if (priceMode === "inc") np = Math.round(p.price * (1 + val / 100));
      else if (priceMode === "dec") np = Math.round(p.price * (1 - val / 100));
      else np = val;
      batch.set(doc(fireDB, "products", p.id), { price: Math.max(0, np) }, { merge: true });
    }
    try {
      await batch.commit();
      toast.success(`${targets.length} mahsulot narxi yangilandi`);
      setPriceModalOpen(false);
      setPriceValue("");
      setSelected(new Set());
    } catch {
      toast.error("Narxni yangilab boʼlmadi");
    }
  };

  /* ------------------------------- duplicate ------------------------------- */
  const duplicate = async (item: ProductT) => {
    try {
      await addDoc(collection(fireDB, "products"), {
        title: `${item.title} (nusxa)`,
        price: item.price,
        category: item.category ?? "",
        subCategory: item.subCategory ?? "",
        description: item.description ?? "",
        isNew: false,
        isBest: false,
        isHidden: true, // hidden until the owner adds photos & reviews it
        quantity: item.quantity ?? 0,
        productImageUrl: [], // its OWN (empty) images — never share storageFileId
        storageFileId: uuidv4(),
        time: Timestamp.now(),
        date: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      });
      toast.success("Nusxa qoʼshildi (yashirin) — rasm qoʼshib, koʼrsating");
    } catch {
      toast.error("Nusxalab boʼlmadi");
    }
  };

  /* ----------------------------- inline price ------------------------------ */
  const startEdit = (item: ProductT) => {
    setEditingId(item.id);
    setEditPrice(String(item.price ?? ""));
  };
  const savePrice = async (id: string) => {
    const val = parseFloat(editPrice);
    const current = products.find((p) => p.id === id);
    setEditingId(null);
    if (isNaN(val) || val < 0 || !current || current.price === val) return;
    try {
      await patchProduct(id, { price: val });
      toast.success("Narx yangilandi");
    } catch {
      toast.error("Saqlab boʼlmadi");
    }
  };

  /* ----------------------------- inline stock ------------------------------ */
  const startStockEdit = (item: ProductT) => {
    setEditingStockId(item.id);
    setEditStock(String(item.quantity ?? 0));
  };
  const saveStock = async (id: string) => {
    const val = parseInt(editStock, 10);
    const current = products.find((p) => p.id === id);
    setEditingStockId(null);
    if (isNaN(val) || val < 0 || !current || current.quantity === val) return;
    try {
      await patchProduct(id, { quantity: val });
      toast.success("Zaxira yangilandi");
    } catch {
      toast.error("Saqlab boʼlmadi");
    }
  };
  // Stock at/under this flags "kam qoldi" (red). Per-product override or default 5.
  const lowStock = (p: ProductT) => (p.quantity ?? 0) <= (p.lowStockThreshold ?? 5);

  const handleDelete = (item: ProductT) => deleteWithUndo([item]);

  return (
    <div>
      <div className="py-5 flex flex-wrap gap-3 justify-between items-center">
        <h1 className=" text-xl text-pink-300 font-bold">Mahsulotlar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <ProductImportExport />
          <Link
            href={"/admin-dashboard/qr-codes"}
            className="px-3 py-2 text-sm bg-white border border-pink-200 text-pink-500 rounded-lg hover:bg-pink-50 inline-flex items-center gap-1.5"
          >
            <BsQrCode className="text-base" /> QR kodlar
          </Link>
          <Link href={"/admin-dashboard/add-product"}>
            <button className="px-5 py-2 bg-pink-50 border border-pink-100 rounded-lg">Mahsulot qoʼshish</button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mahsulot izlash (nomi yoki kategoriya)..."
          className="w-full sm:max-w-md px-3 py-2 border border-pink-200 rounded-lg outline-none focus:ring-1 focus:ring-pink-300 text-slate-700 placeholder-slate-400"
        />
        {search && <p className="text-xs text-slate-400 mt-1">{visible.length} ta mahsulot topildi</p>}
      </div>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 mb-3 shadow-sm">
          <span className="text-sm font-semibold text-pink-700">{selected.size} tanlandi</span>
          <button onClick={() => bulkSetFlag({ isNew: true }, "Yangi")} className={chip}>Yangi ✓</button>
          <button onClick={() => bulkSetFlag({ isNew: false }, "Yangi olib tashlandi")} className={chip}>Yangi ✗</button>
          <button onClick={() => bulkSetFlag({ isBest: true }, "Top")} className={chip}>Top ✓</button>
          <button onClick={() => bulkSetFlag({ isBest: false }, "Top olib tashlandi")} className={chip}>Top ✗</button>
          <button onClick={() => bulkSetFlag({ isHidden: true }, "Yashirildi")} className={chip}>Yashirish</button>
          <button onClick={() => bulkSetFlag({ isHidden: false }, "Koʼrsatildi")} className={chip}>Koʼrsatish</button>
          <button onClick={() => setPriceModalOpen(true)} className={chip}>Narx</button>
          <button
            onClick={() => deleteWithUndo(selectedProducts)}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-500 text-white hover:bg-red-600"
          >
            Oʼchirish
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-sm text-slate-500 hover:underline">
            Tozalash
          </button>
        </div>
      )}

      <div className="flex justify-center relative top-20">{loading && products.length === 0 && <Loader />}</div>

      <div className="w-full overflow-x-auto mb-5">
        <table className="w-full text-left border border-collapse sm:border-separate border-pink-100 text-pink-400">
          <tbody>
            <tr>
              <th scope="col" className={th}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="size-4 accent-pink-500" />
              </th>
              <th scope="col" className={th}>№</th>
              <th scope="col" className={th}>Rasm</th>
              <th scope="col" className={th}>Nomi</th>
              <th scope="col" className={`${th} min-w-24`}>Narx / Tan</th>
              <th scope="col" className={th}>Zaxira</th>
              <th scope="col" className={th}>Kategoriya</th>
              <th scope="col" className={`${th} min-w-24`}>Sana</th>
              <th scope="col" className={th}>Yangi</th>
              <th scope="col" className={th}>Top</th>
              <th scope="col" className={th}>Koʼrinadi</th>
              <th scope="col" className={th}>QR / Havola</th>
              <th scope="col" className={th}>Nusxa</th>
              <th scope="col" className={th}>Tahrir</th>
              <th scope="col" className={th}>Oʼchirish</th>
            </tr>
            {visible.map((item, index) => {
              const { id, title, price, costPrice, category, date, productImageUrl } = item;
              const isSel = selected.has(id);
              return (
                <tr key={id} className={`text-pink-300 ${isSel ? "bg-pink-50/60" : ""}`}>
                  <td className={td}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleSelect(id)} className="size-4 accent-pink-500" />
                  </td>
                  <td className={`${td} text-slate-500`}>{index + 1}.</td>
                  <td className={`${td} text-slate-500 first-letter:uppercase`}>
                    <div className="flex justify-center">
                      {productImageUrl?.[0]?.url ? (
                        <Image width={80} height={80} className="w-20" src={productImageUrl[0].url} alt="" />
                      ) : (
                        <NoPhoto className="w-20 h-20 rounded" />
                      )}
                    </div>
                  </td>
                  <td className={`${td} text-slate-500 first-letter:uppercase`}>{title}</td>
                  <td className={`${td} text-slate-500`}>
                    {editingId === id ? (
                      <input
                        autoFocus
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          else if (e.key === "Escape") {
                            skipSave.current = true;
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={() => {
                          if (skipSave.current) {
                            skipSave.current = false;
                            setEditingId(null);
                          } else savePrice(id);
                        }}
                        className="w-24 px-1.5 py-1 border border-pink-300 rounded outline-none text-slate-700"
                      />
                    ) : (
                      <div>
                        <button onClick={() => startEdit(item)} title="Narxni tahrirlash" className="hover:text-pink-600 hover:underline">
                          {FormattedPrice(price)} UZS
                        </button>
                        {costPrice ? (
                          <span className="block text-[11px] text-slate-400">tan: {FormattedPrice(costPrice)}</span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  {/* Zaxira (stock) — inline edit + 📦 kirim/chiqim/tuzatish (logged) */}
                  <td className={td}>
                    <div className="flex items-center justify-center gap-2">
                      {editingStockId === id ? (
                        <input
                          autoFocus
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            else if (e.key === "Escape") {
                              skipSave.current = true;
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={() => {
                            if (skipSave.current) {
                              skipSave.current = false;
                              setEditingStockId(null);
                            } else saveStock(id);
                          }}
                          className="w-16 px-1.5 py-1 border border-pink-300 rounded outline-none text-slate-700"
                        />
                      ) : (
                        <button
                          onClick={() => startStockEdit(item)}
                          title="Zaxirani tahrirlash"
                          className={`font-semibold hover:underline ${lowStock(item) ? "text-red-500" : "text-slate-600"}`}
                        >
                          {item.quantity ?? 0}
                          {lowStock(item) && <span className="block text-[10px] font-normal">kam qoldi</span>}
                        </button>
                      )}
                      <button
                        onClick={() => setStockProduct(item)}
                        title="Zaxira harakati: qoʼshish / ayirish / tuzatish"
                        className="text-slate-400 hover:text-pink-500"
                      >
                        <FiBox className="text-base" />
                      </button>
                    </div>
                  </td>
                  <td className={`${td} text-slate-500 first-letter:uppercase`}>{category}</td>
                  <td className={`${td} text-slate-500 first-letter:uppercase`}>{date.toString()}</td>
                  <ProductRow item={item} />
                  <td className={td}>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setQrProduct(item)} title="QR kod">
                        <BsQrCode className="text-slate-600 text-xl cursor-pointer hover:text-pink-500" />
                      </button>
                      <button onClick={() => copyLink(id)} title="Havolani nusxalash">
                        <FiLink className="text-slate-600 text-xl cursor-pointer hover:text-pink-500" />
                      </button>
                    </div>
                  </td>
                  <td className={td}>
                    <button onClick={() => duplicate(item)} title="Nusxa olish">
                      <FiCopy className="text-slate-600 text-xl mx-auto cursor-pointer hover:text-pink-500" />
                    </button>
                  </td>
                  <td className={td}>
                    <Link href={`/admin-dashboard/update-product/${id}`}>
                      <CiEdit className="text-green-500 text-2xl mx-auto cursor-pointer" />
                    </Link>
                  </td>
                  <td className={td}>
                    <button onClick={() => handleDelete(item)}>
                      <MdDeleteForever className="text-red-500 text-2xl mx-auto cursor-pointer" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* QR dialog */}
      {qrProduct && <ProductQRCode product={qrProduct} onClose={() => setQrProduct(null)} />}

      {/* Stock movement (kirim / chiqim / tuzatish) */}
      {stockProduct && (
        <StockMovementModal product={stockProduct} onClose={() => setStockProduct(null)} />
      )}

      {/* Bulk price modal */}
      {priceModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPriceModalOpen(false)}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-pink-600 mb-1">Narxni oʼzgartirish</h3>
            <p className="text-sm text-slate-500 mb-4">{selected.size} ta mahsulot tanlandi</p>
            <select
              value={priceMode}
              onChange={(e) => setPriceMode(e.target.value as "inc" | "dec" | "set")}
              className="w-full px-3 py-2 border border-pink-200 rounded-lg outline-none text-slate-700 mb-3"
            >
              <option value="inc">Foizga oshirish (+%)</option>
              <option value="dec">Foizga kamaytirish (−%)</option>
              <option value="set">Belgilangan narx (UZS)</option>
            </select>
            <input
              type="number"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              placeholder={priceMode === "set" ? "Yangi narx (UZS)" : "Foiz (%)"}
              className="w-full px-3 py-2 border border-pink-200 rounded-lg outline-none text-slate-700"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setPriceModalOpen(false)}
                className="px-4 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={applyPriceChange}
                className="px-4 py-2 rounded-md bg-pink-500 text-white font-semibold hover:bg-pink-600"
              >
                Qoʼllash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
