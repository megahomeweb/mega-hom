"use client";
import Loader from "@/components/Loader";
import { fireDB, fireStorage } from "@/firebase/FirebaseConfig";
import { CategoryI, ImageT } from "@/lib/types";
import { isManagerPlus } from "@/lib/roles";
import { useRole } from "@/components/admin/RoleContext";
import NoAccess from "@/components/admin/NoAccess";
import VatExplainer from "@/components/admin/VatExplainer";
import useCategoryStore from "@/zustand/useCategoryStore";
import { Switch } from "@headlessui/react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import ProductImage from "@/components/ProductImage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from 'uuid';
import { optimizeImageForUpload } from "@/utils/optimizeImage";

const AddProductPage = () => {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryI | null>(null);
  const { categories, fetchCategories } = useCategoryStore();
  const me = useRole();
  // Stable per-form storage folder id, generated once. Every image for this new
  // product goes under products/<storageFileId>/ and the SAME id is saved on the
  // doc, so a later delete targets the right folder. (The old code minted a fresh
  // uuid on every upload batch and then overwrote storageFileId with it, leaving
  // it pointing at an empty folder when images were added in more than one go.)
  const [storageFileId] = useState(() => uuidv4());

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // navigate
  const navigate = useRouter();

  // product state
  const [product, setProduct] = useState({
    title: "",
    price: "",
    costPrice: "",
    productImageUrl: [] as ImageT[],
    category: "",
    subCategory: "",
    description: "",
    isBest: false,
    isNew: false,
    ikpu: "",
    vatRate: 12,
    barcode: "",
    quantity: "",
    time: Timestamp.now(),
    date: new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    storageFileId: ""
  });

  // Upload one or more images into this product's stable storage folder and
  // append them to the gallery. Wrapped in try/finally so a rejected upload
  // (Storage rules denying a non-admin, a dropped connection, an oversized file)
  // can NEVER leave the form stuck on the loading spinner — the old code had no
  // catch, so any failure hung the page forever and the product could never be
  // saved (the image URL was never captured, so the required-image guard tripped).
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const optimized = await optimizeImageForUpload(file);
        // uuid-prefix the name so two files both called "image.jpg" can't collide.
        const safeName = `${uuidv4().slice(0, 8)}-${optimized.name}`;
        const storageRef = ref(fireStorage, `products/${storageFileId}/${safeName}`);
        await uploadBytes(storageRef, optimized);
        const downloadUrl = await getDownloadURL(storageRef);
        return { url: downloadUrl, path: storageRef.fullPath };
      });
      const imageUrls = await Promise.all(uploadPromises);
      setProduct((prevProduct) => ({
        ...prevProduct,
        productImageUrl: [...prevProduct.productImageUrl, ...imageUrls],
      }));
      toast.success(imageUrls.length > 1 ? `${imageUrls.length} ta rasm yuklandi` : "Rasm yuklandi");
    } catch (error) {
      console.error("Image upload failed:", error);
      // optimizeImageForUpload throws a specific Uzbek message for HEIC/TIFF —
      // show it; anything else gets the generic permission/network hint.
      toast.error(
        error instanceof Error && error.message.includes(":")
          ? error.message
          : "Rasmni yuklab boʼlmadi — ruxsat yoki internet aloqasini tekshiring"
      );
    } finally {
      setLoading(false);
    }
  };

  // Remove an already-uploaded image from the gallery and delete it from Storage.
  const handleRemoveImage = async (image: ImageT) => {
    setProduct((prevProduct) => ({
      ...prevProduct,
      productImageUrl: prevProduct.productImageUrl.filter((im) => im.url !== image.url),
    }));
    if (!image.path?.trim()) return;
    try {
      await deleteObject(ref(fireStorage, image.path));
    } catch (error) {
      console.error("Error removing image:", error);
    }
  };

  // get sub category
  const handleGetSubCategory = (value:string) => {
    const findCategory = categories.find(c => c.name == value);
    if(findCategory){
      setSelectedCategory(findCategory)
    }
  }

  // Add Product Function
  const addProductFunction = async () => {
    if (
      product.title == "" ||
      product.price == "" ||
      product.productImageUrl.length == 0 ||
      product.category == "" ||
      product.description == ""
    ) {
      return toast.error("Barcha asosiy maydonlarni toʼldiring");
    }

    setLoading(true);
    try {
      const productRef = collection(fireDB, "products");
      // Coerce the money/stock fields to real numbers so margin + inventory math
      // is correct (the form holds them as strings for clean empty inputs).
      await addDoc(productRef, {
        ...product,
        price: Number(product.price) || 0,
        costPrice: Number(product.costPrice) || 0,
        quantity: Number(product.quantity) || 0,
        storageFileId,
      });
      toast.success("Mahsulot qoʼshildi");
      navigate.push("/admin-dashboard");
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
      toast.error("Mahsulot qoʼshib boʼlmadi");
    }
  };
  
  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  return (
    <div className="flex justify-center items-start sm:items-center min-h-screen p-4">
      {loading && <Loader />}
      {/* Login Form  */}
      <div className="login_Form w-full max-w-md bg-brand-50 px-5 sm:px-8 py-6 border border-brand-100 rounded-xl shadow-md">
        {/* Top Heading  */}
        <div className="mb-5">
          <h2 className="text-center text-2xl font-bold text-brand-500 ">Mahsulot qoʼshish</h2>
        </div>
        {/* Input title  */}
        <div className="mb-3">
          <input
            type="text"
            name="title"
            value={product.title}
            onChange={(e) => {
              setProduct({
                ...product,
                title: e.target.value,
              });
            }}
            placeholder="Mahsulot nomi"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
          />
        </div>
        {/* Input price  */}
        <div className="mb-3">
          <input
            type="number"
            name="price"
            value={product.price}
            onChange={(e) => {
              setProduct({
                ...product,
                price: e.target.value,
              });
            }}
            placeholder="Sotish narxi (UZS)"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
          />
        </div>
        {/* Cost (tan narx) + Stock (zaxira) — drive margin/profit and inventory */}
        <div className="mb-3 flex gap-3 w-full">
          <input
            type="number"
            name="costPrice"
            value={product.costPrice}
            onChange={(e) => setProduct({ ...product, costPrice: e.target.value })}
            placeholder="Tan narx (xarid)"
            title="Tan narx — foyda shu asosda hisoblanadi (mijozga koʼrinmaydi)"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 flex-1 rounded-md outline-none placeholder-brand-300"
          />
          <input
            type="number"
            name="quantity"
            value={product.quantity}
            onChange={(e) => setProduct({ ...product, quantity: e.target.value })}
            placeholder="Zaxira (dona)"
            title="Ombordagi miqdor"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-32 rounded-md outline-none placeholder-brand-300"
          />
        </div>
        {/* Input img — multiple images supported (e.g. one product in several
            colours). Uploaded images preview below, each with a remove button. */}
        <div className="mb-3">
          {product.productImageUrl.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {product.productImageUrl.map((img, index) => (
                <div key={img.path || img.url || index} className="relative w-20 h-20">
                  <ProductImage
                    src={img.url}
                    alt={`Rasm ${index + 1}`}
                    fill
                    sizes="80px"
                    className="rounded-md object-cover"
                    fallbackClassName="absolute inset-0 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img)}
                    className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center z-10"
                    title="Rasmni oʼchirish"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            multiple
            name="productImageUrl"
            onChange={(e) => {
              handleImageUpload(e.target.files);
              e.target.value = ""; // allow re-selecting the same file after a remove
            }}
            accept="image/*"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
          />
          <p className="text-xs text-brand-400 mt-1">Bir nechta rasm tanlashingiz mumkin (har xil ranglar uchun).</p>
        </div>
        {/* Input category  */}
        <div className="mb-3">
          <select
            value={product.category}
            onChange={(e) => {
              setProduct({
                ...product,
                category: e.target.value,
              });
              handleGetSubCategory(e.target.value)
            }}
            className="w-full px-1 py-2 text-brand-700 bg-brand-50 border border-brand-200 rounded-md outline-none  "
          >
            <option >Kategoriyani tanlang</option>
            {categories.map((value) => {
              const { name, id } = value;
              return (
                <option
                  className=" first-letter:uppercase"
                  key={id}
                  value={name}
                >
                  {name}
                </option>
              );
            })}
          </select>
        </div>
        {/* Input sub category  */}
        <div className="mb-3">
          <select
            disabled={selectedCategory == null}
            value={product.subCategory}
            onChange={(e) => {
              setProduct({
                ...product,
                subCategory: e.target.value,
              });
            }}
            className="w-full px-1 py-2 text-brand-700 bg-brand-50 border border-brand-200 rounded-md outline-none  "
          >
            <option >Subkategoriyani tanlang</option>
            {selectedCategory?.subcategory.map((value,idx) => {
              return (
                <option
                  className=" first-letter:uppercase"
                  key={idx}
                  value={value}
                >
                  {value}
                </option>
              );
            })}
          </select>
        </div>
        {/* Input description  */}
        <div className="mb-3">
          <textarea
            value={product.description}
            onChange={(e) => {
              setProduct({
                ...product,
                description: e.target.value,
              });
            }}
            name="description"
            placeholder="Mahsulot tavsifi"
            rows={5}
            className=" w-full px-2 py-1 text-brand-700 bg-brand-50 border border-brand-200 rounded-md outline-none placeholder-brand-300 "
          ></textarea>
        </div>
        {/* Fiscal + POS fields (Uzbekistan ChEK) */}
        <div className="mb-3 space-y-3 border-t border-brand-100 pt-3">
          <input
            type="text"
            inputMode="numeric"
            value={product.ikpu}
            onChange={(e) =>
              setProduct({ ...product, ikpu: e.target.value.replace(/\D/g, "").slice(0, 17) })
            }
            placeholder="IKPU / MXIK kodi (17 raqam) — tasnif.soliq.uz"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
          />
          <div className="flex gap-3 w-full">
            <div className="w-28">
              <label htmlFor="add-vat-rate" className="block text-xs text-brand-500 mb-1">
                QQS stavkasi %
              </label>
              <input
                id="add-vat-rate"
                type="number"
                min={0}
                max={100}
                step={1}
                value={product.vatRate}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value));
                  setProduct({
                    ...product,
                    vatRate: Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0)),
                  });
                }}
                placeholder="QQS %"
                title="QQS (VAT) foizi"
                className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="add-barcode" className="block text-xs text-brand-500 mb-1">
                Shtrix-kod (ixtiyoriy)
              </label>
              <input
                id="add-barcode"
                type="text"
                value={product.barcode}
                onChange={(e) => setProduct({ ...product, barcode: e.target.value })}
                placeholder="Shtrix-kod"
                className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
              />
            </div>
          </div>
          <VatExplainer price={Number(product.price) || 0} vatRate={product.vatRate} />
        </div>
        <div className="flex items-start divide-x-2 gap-4 mb-3">
          <div>
            <span className="text-sm text-brand block capitalize mb-1">
              Top mahsulot
            </span>
            <Switch
              checked={product.isBest}
              onChange={() => setProduct({ ...product, isBest: !product.isBest })}
              className={`${
                product.isBest ? 'bg-brand' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
            >
              <span
                className={`${
                  product.isBest ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
          <div className="pl-4">
            <span className="text-sm text-brand block capitalize mb-1">
              Yangi mahsulot
            </span>
            <Switch
              checked={product.isNew}
              onChange={() => setProduct({...product, isNew: !product.isNew})}
              className={`${
                product.isNew ? 'bg-brand' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
            >
              <span
                className={`${
                  product.isNew ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
        </div>
        {/* Add Product Button  */}
        <div className="mb-3">
          <button
            disabled={loading} 
            onClick={addProductFunction}
            type="button"
            className="bg-brand-500 hover:bg-brand-600 w-full text-white text-center py-2 font-bold rounded-md "
          >
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;
