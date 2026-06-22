"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../Loader";
import { CiEdit } from "react-icons/ci";
import { MdDeleteForever } from "react-icons/md";
import { BsQrCode } from "react-icons/bs";
import { FiCopy, FiLink, FiBox } from "react-icons/fi";
import useProductStore from "@/zustand/useProductStore";
import toast, { Toast } from "react-hot-toast";
import { ProductT } from "@/lib/types";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
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
  "h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100";
const td =
  "h-12 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 ";
const chip =
  "px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-brand-200 text-brand-600 hover:bg-brand-100";

const ProductDetail = () => {
  const { products, loading, fetchProducts, deleteProduct, bulkPatch, patchProduct } = useProductStore();
  const [qrProduct, setQrProduct] = useState<ProductT | null>(null);
  const [stockProduct, setStockProduct] = useState<ProductT | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"new" | "stock" | "price-asc" | "price-desc" | "name">("new");
  const [shown, setShown] = useState(24);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceMode, setPriceMode] = useState<"inc" | "dec" | "set">("inc");
  const [priceValue, setPriceValue] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const skipSave = useRef(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (pendingDelete.has(p.id)) return false;
      if (!q) return true;
      return (
        (p.title ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
    const sec = (p: ProductT) => (p.time as unknown as { seconds?: number })?.seconds ?? 0;
    const cmp = (a: ProductT, b: ProductT) => {
      switch (sort) {
        case "stock": return (a.quantity ?? 0) - (b.quantity ?? 0); // low → high (reorder view)
        case "price-asc": return (a.price ?? 0) - (b.price ?? 0);
        case "price-desc": return (b.price ?? 0) - (a.price ?? 0);
        case "name": return (a.title ?? "").localeCompare(b.title ?? "");
        default: return sec(b) - sec(a); // newest first
      }
    };
    return [...filtered].sort(cmp);
  }, [products, pendingDelete, search, sort]);

  // Reset the visible window whenever the filter/sort changes.
  useEffect(() => { setShown(24); }, [search, sort]);

  const paged = visible.slice(0, shown);
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
            className="font-semibold text-brand-600 underline"
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
    if (isNaN(val) || val < 0) return toast.error("Qiymat notoʼgʼri");
    const targets = selectedProducts;
    if (!targets.length) return;
    // Preview the resulting range + warn on below-cost, so a mis-entered bulk
    // change can't silently slash every price (or push them under cost).
    const results = targets.map((p) => {
      let np = p.price;
      if (priceMode === "inc") np = Math.round(p.price * (1 + val / 100));
      else if (priceMode === "dec") np = Math.round(p.price * (1 - val / 100));
      else np = Math.round(val);
      return { p, np: Math.max(0, np) };
    });
    const min = Math.min(...results.map((r) => r.np));
    const max = Math.max(...results.map((r) => r.np));
    const belowCost = results.filter((r) => r.p.costPrice && r.np < (r.p.costPrice ?? 0)).length;
    const msg =
      `${targets.length} ta mahsulot narxi: ${FormattedPrice(min)} – ${FormattedPrice(max)} UZS.` +
      (belowCost ? `\n⚠ ${belowCost} tasi tan narxdan past boʼladi.` : "") +
      `\nDavom etilsinmi?`;
    if (typeof window !== "undefined" && !window.confirm(msg)) return;
    const batch = writeBatch(fireDB);
    for (const r of results) batch.set(doc(fireDB, "products", r.p.id), { price: r.np }, { merge: true });
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
        date: Timestamp.now(),
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
    if (val > 1_000_000_000) return toast.error("Narx juda katta");
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
    if (val > 10_000_000) return toast.error("Zaxira qiymati juda katta");
    try {
      await patchProduct(id, { quantity: val });
      toast.success("Zaxira yangilandi");
    } catch {
      toast.error("Saqlab boʼlmadi");
    }
  };
  // Stock at/under this flags "kam qoldi" (red). Per-product override or default 5.
  const lowStock = (p: ProductT) => (p.quantity ?? 0) <= (p.lowStockThreshold ?? 5);
  // Sana column — products carry `time` (Timestamp) consistently; older rows may
  // have a string `date`. Render whichever is readable instead of "[object]".
  const fmtDate = (p: ProductT) => {
    const t = p.time as unknown as { seconds?: number } | undefined;
    if (t?.seconds) return new Date(t.seconds * 1000).toLocaleDateString();
    return typeof (p.date as unknown) === "string" ? (p.date as unknown as string) : "—";
  };

  const handleDelete = (item: ProductT) => deleteWithUndo([item]);

  // Single-product flag toggle (used by the mobile cards).
  const togglePatch = async (id: string, data: Partial<ProductT>) => {
    try {
      await patchProduct(id, data);
    } catch {
      toast.error("Saqlab boʼlmadi");
    }
  };
  const tchip = (on: boolean) =>
    `text-[10px] px-2 py-1 rounded-full border transition-colors ${
      on ? "bg-brand-500 text-white border-brand-500" : "bg-white text-slate-400 border-slate-200"
    }`;

  // Inline image add — attach photos to a product straight from the list. This
  // is the fast path for BULK-IMPORTED products, which arrive with no images
  // (a CSV can carry text but not local photo files). Uploads into the product's
  // storage folder and patches productImageUrl; try/finally so a failed upload
  // can never hang the per-row spinner.
  const addImages = async (item: ProductT, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingId(item.id);
    try {
      const folder = item.storageFileId || item.id;
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          const safeName = `${uuidv4().slice(0, 8)}-${file.name}`;
          const sref = ref(fireStorage, `products/${folder}/${safeName}`);
          await uploadBytes(sref, file);
          const url = await getDownloadURL(sref);
          return { url, path: sref.fullPath };
        })
      );
      await patchProduct(item.id, {
        productImageUrl: [...(item.productImageUrl ?? []), ...uploads],
        storageFileId: folder,
      });
      toast.success(uploads.length > 1 ? `${uploads.length} ta rasm qoʼshildi` : "Rasm qoʼshildi");
    } catch (error) {
      console.error("Inline image upload failed:", error);
      toast.error("Rasmni yuklab boʼlmadi — ruxsatni tekshiring");
    } finally {
      setUploadingId(null);
    }
  };

  // Clickable thumbnail that doubles as an "add photo" control. boxClass sizes
  // the square (size-16 on cards, size-20 in the table). Shows a count badge for
  // multi-image products and a spinner while uploading.
  const imageUploader = (item: ProductT, boxClass: string) => (
    <label className={`relative block ${boxClass} cursor-pointer group rounded overflow-hidden`} title="Rasm qoʼshish">
      {item.productImageUrl?.[0]?.url ? (
        <Image fill sizes="80px" className="object-cover" src={item.productImageUrl[0].url} alt="" />
      ) : (
        <NoPhoto className="w-full h-full" />
      )}
      {(item.productImageUrl?.length ?? 0) > 1 && (
        <span className="absolute bottom-0 right-0 bg-brand-600 text-white text-[9px] px-1 rounded-tl">
          {item.productImageUrl.length}
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition">
        + Rasm
      </span>
      {uploadingId === item.id && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/70">
          <span className="size-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </span>
      )}
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          addImages(item, e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );

  return (
    <div>
      <div className="py-5 flex flex-wrap gap-3 justify-between items-center">
        <h1 className=" text-xl text-brand-700 font-bold">Mahsulotlar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <ProductImportExport />
          <Link
            href={"/admin-dashboard/qr-codes"}
            className="px-3 py-2 text-sm bg-white border border-brand-200 text-brand-500 rounded-lg hover:bg-brand-50 inline-flex items-center gap-1.5"
          >
            <BsQrCode className="text-base" /> QR kodlar
          </Link>
          <Link href={"/admin-dashboard/add-product"}>
            <button className="px-5 py-2 bg-brand-50 border border-brand-100 rounded-lg">Mahsulot qoʼshish</button>
          </Link>
        </div>
      </div>

      {/* Search + sort */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nomi, kategoriya, shtrix-kod yoki ID boʼyicha izlash..."
          className="flex-1 min-w-[200px] sm:max-w-md px-3 py-2 border border-brand-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          title="Saralash"
          className="px-3 py-2 border border-brand-200 rounded-lg outline-none text-slate-600 text-sm focus:ring-1 focus:ring-brand-300"
        >
          <option value="new">Avval yangi</option>
          <option value="stock">Zaxira (kam → koʼp)</option>
          <option value="price-asc">Narx (arzon → qimmat)</option>
          <option value="price-desc">Narx (qimmat → arzon)</option>
          <option value="name">Nomi (A→Z)</option>
        </select>
        <p className="text-xs text-slate-400 w-full sm:w-auto sm:ml-1">
          {visible.length} ta mahsulot{search ? " topildi" : ""}
        </p>
      </div>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mb-3 shadow-sm">
          <span className="text-sm font-semibold text-brand-700">{selected.size} tanlandi</span>
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

      {/* ---------- Mobile cards (lg:hidden) ---------- */}
      <div className="lg:hidden space-y-3 mb-5">
        {paged.map((item) => {
          const { id, title, price, costPrice, category } = item;
          const isSel = selected.has(id);
          return (
            <div key={id} className={`rounded-xl border p-3 ${isSel ? "border-brand-300 bg-brand-50/60" : "border-brand-100 bg-white"}`}>
              <div className="flex gap-3">
                <input type="checkbox" checked={isSel} onChange={() => toggleSelect(id)} className="size-4 accent-brand-500 mt-1 shrink-0" />
                <div className="shrink-0">
                  {imageUploader(item, "size-16")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 capitalize leading-tight line-clamp-2">{title}</p>
                  <div className="mt-0.5">
                    {editingId === id ? (
                      <input
                        autoFocus type="number" value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { skipSave.current = true; e.currentTarget.blur(); } }}
                        onBlur={() => { if (skipSave.current) { skipSave.current = false; setEditingId(null); } else savePrice(id); }}
                        className="w-24 px-1.5 py-0.5 border border-brand-300 rounded outline-none text-slate-700"
                      />
                    ) : (
                      <button onClick={() => startEdit(item)} className="text-brand-600 font-semibold text-sm hover:underline">{FormattedPrice(price)} UZS</button>
                    )}
                    {costPrice ? <span className="text-[11px] text-slate-400 ml-2">tan: {FormattedPrice(costPrice)}</span> : null}
                  </div>
                  <p className="text-xs text-slate-400 capitalize mt-0.5">{category}</p>
                </div>
                <div className="shrink-0 text-right">
                  {editingStockId === id ? (
                    <input
                      autoFocus type="number" value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { skipSave.current = true; e.currentTarget.blur(); } }}
                      onBlur={() => { if (skipSave.current) { skipSave.current = false; setEditingStockId(null); } else saveStock(id); }}
                      className="w-14 px-1.5 py-0.5 border border-brand-300 rounded text-slate-700 text-right"
                    />
                  ) : (
                    <button onClick={() => startStockEdit(item)} className={`font-bold text-sm leading-tight ${lowStock(item) ? "text-red-500" : "text-slate-600"}`}>
                      {item.quantity ?? 0}
                      <span className="block text-[9px] font-normal text-slate-400">dona</span>
                    </button>
                  )}
                  {lowStock(item) && <span className="block text-[9px] text-red-500">kam qoldi</span>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-brand-50">
                <div className="flex items-center gap-1">
                  <button onClick={() => togglePatch(id, { isNew: !item.isNew })} className={tchip(!!item.isNew)}>Yangi</button>
                  <button onClick={() => togglePatch(id, { isBest: !item.isBest })} className={tchip(!!item.isBest)}>Top</button>
                  <button onClick={() => togglePatch(id, { isHidden: !item.isHidden })} className={tchip(!item.isHidden)}>Koʼrinadi</button>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <button onClick={() => setStockProduct(item)} title="Zaxira"><FiBox className="text-lg hover:text-brand-500" /></button>
                  <button onClick={() => setQrProduct(item)} title="QR kod"><BsQrCode className="text-lg hover:text-brand-500" /></button>
                  <button onClick={() => duplicate(item)} title="Nusxa"><FiCopy className="text-lg hover:text-brand-500" /></button>
                  <Link href={`/admin-dashboard/update-product/${id}`} title="Tahrirlash"><CiEdit className="text-xl text-green-500" /></Link>
                  <button onClick={() => handleDelete(item)} title="Oʼchirish"><MdDeleteForever className="text-xl text-red-500" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Desktop table (lg+) ---------- */}
      <div className="hidden lg:block w-full overflow-x-auto mb-5">
        <table className="w-full text-left border border-collapse sm:border-separate border-brand-100 text-brand-400">
          <tbody>
            <tr>
              <th scope="col" className={th}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="size-4 accent-brand-500" />
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
            {paged.map((item, index) => {
              const { id, title, price, costPrice, category } = item;
              const isSel = selected.has(id);
              return (
                <tr key={id} className={`text-brand-300 ${isSel ? "bg-brand-50/60" : ""}`}>
                  <td className={td}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleSelect(id)} className="size-4 accent-brand-500" />
                  </td>
                  <td className={`${td} text-slate-500`}>{index + 1}.</td>
                  <td className={`${td} text-slate-500 first-letter:uppercase`}>
                    <div className="flex justify-center">
                      {imageUploader(item, "size-20")}
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
                        className="w-24 px-1.5 py-1 border border-brand-300 rounded outline-none text-slate-700"
                      />
                    ) : (
                      <div>
                        <button onClick={() => startEdit(item)} title="Narxni tahrirlash" className="hover:text-brand-600 hover:underline">
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
                          className="w-16 px-1.5 py-1 border border-brand-300 rounded outline-none text-slate-700"
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
                        className="text-slate-400 hover:text-brand-500"
                      >
                        <FiBox className="text-base" />
                      </button>
                    </div>
                  </td>
                  <td className={`${td} text-slate-500 first-letter:uppercase`}>{category}</td>
                  <td className={`${td} text-slate-500 whitespace-nowrap`}>{fmtDate(item)}</td>
                  <ProductRow item={item} />
                  <td className={td}>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setQrProduct(item)} title="QR kod">
                        <BsQrCode className="text-slate-600 text-xl cursor-pointer hover:text-brand-500" />
                      </button>
                      <button onClick={() => copyLink(id)} title="Havolani nusxalash">
                        <FiLink className="text-slate-600 text-xl cursor-pointer hover:text-brand-500" />
                      </button>
                    </div>
                  </td>
                  <td className={td}>
                    <button onClick={() => duplicate(item)} title="Nusxa olish">
                      <FiCopy className="text-slate-600 text-xl mx-auto cursor-pointer hover:text-brand-500" />
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

      {!loading && visible.length === 0 && (
        <p className="text-center text-slate-400 py-12">
          {search ? "Qidiruv boʼyicha mahsulot topilmadi." : "Hozircha mahsulot yoʼq."}
        </p>
      )}
      {visible.length > shown && (
        <div className="flex justify-center pb-6">
          <button
            onClick={() => setShown((s) => s + 24)}
            className="px-5 py-2 rounded-lg border border-brand-200 text-brand-600 font-medium hover:bg-brand-50"
          >
            Yana koʼrsatish ({visible.length - shown})
          </button>
        </div>
      )}

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
            <h3 className="text-lg font-bold text-brand-600 mb-1">Narxni oʼzgartirish</h3>
            <p className="text-sm text-slate-500 mb-4">{selected.size} ta mahsulot tanlandi</p>
            <select
              value={priceMode}
              onChange={(e) => setPriceMode(e.target.value as "inc" | "dec" | "set")}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg outline-none text-slate-700 mb-3"
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
              className="w-full px-3 py-2 border border-brand-200 rounded-lg outline-none text-slate-700"
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
                className="px-4 py-2 rounded-md bg-brand-500 text-white font-semibold hover:bg-brand-600"
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
