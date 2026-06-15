"use client";
import Loader from "@/components/Loader";
import { fireDB, fireStorage } from "@/firebase/FirebaseConfig";
import { CategoryI, ImageT } from "@/lib/types";
import { isManagerPlus } from "@/lib/roles";
import { useRole } from "@/components/admin/RoleContext";
import NoAccess from "@/components/admin/NoAccess";
import useCategoryStore from "@/zustand/useCategoryStore";
import { Switch } from "@headlessui/react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from 'uuid';

const AddProductPage = () => {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryI | null>(null);
  const { categories, fetchCategories } = useCategoryStore();
  const me = useRole();

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

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    setLoading(true);

    const uuid = uuidv4();
    const uploadPromises = Array.from(files).map(async (file) => {
      const storageRef = product.storageFileId.length === 0 ? ref(fireStorage, `products/${uuid}/${file.name}`) : ref(fireStorage, `products/${product.storageFileId}/${file.name}`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      return { url: downloadUrl, path: storageRef.fullPath };
    });

    const imageUrls = await Promise.all(uploadPromises);
    setProduct((prevProduct) => ({
      ...prevProduct,
      productImageUrl: [...prevProduct.productImageUrl, ...imageUrls],
      storageFileId: uuid
    }));
    setLoading(false);
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
      <div className="login_Form w-full max-w-md bg-pink-50 px-5 sm:px-8 py-6 border border-pink-100 rounded-xl shadow-md">
        {/* Top Heading  */}
        <div className="mb-5">
          <h2 className="text-center text-2xl font-bold text-pink-500 ">Mahsulot qoʼshish</h2>
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
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-full rounded-md outline-none placeholder-pink-300"
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
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-full rounded-md outline-none placeholder-pink-300"
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
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 flex-1 rounded-md outline-none placeholder-pink-300"
          />
          <input
            type="number"
            name="quantity"
            value={product.quantity}
            onChange={(e) => setProduct({ ...product, quantity: e.target.value })}
            placeholder="Zaxira (dona)"
            title="Ombordagi miqdor"
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-32 rounded-md outline-none placeholder-pink-300"
          />
        </div>
        {/* Input img  */}
        <div className="mb-3">
          <input
            type="file"
            multiple
            name="productImageUrl"
            onChange={(e) => handleImageUpload(e.target.files)}
            placeholder="Mahsulot rasmi"
            accept="image/*"
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-full rounded-md outline-none placeholder-pink-300"
          />
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
            className="w-full px-1 py-2 text-pink-300 bg-pink-50 border border-pink-200 rounded-md outline-none  "
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
            className="w-full px-1 py-2 text-pink-300 bg-pink-50 border border-pink-200 rounded-md outline-none  "
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
            className=" w-full px-2 py-1 text-pink-300 bg-pink-50 border border-pink-200 rounded-md outline-none placeholder-pink-300 "
          ></textarea>
        </div>
        {/* Fiscal + POS fields (Uzbekistan ChEK) */}
        <div className="mb-3 space-y-3 border-t border-pink-100 pt-3">
          <input
            type="text"
            inputMode="numeric"
            value={product.ikpu}
            onChange={(e) =>
              setProduct({ ...product, ikpu: e.target.value.replace(/\D/g, "").slice(0, 17) })
            }
            placeholder="IKPU / MXIK kodi (17 raqam) — tasnif.soliq.uz"
            className="bg-pink-50 border text-pink-400 border-pink-200 px-2 py-2 w-full rounded-md outline-none placeholder-pink-300"
          />
          <div className="flex gap-3 w-full">
            <input
              type="number"
              value={product.vatRate}
              onChange={(e) => setProduct({ ...product, vatRate: Number(e.target.value) })}
              placeholder="QQS %"
              title="QQS (VAT) foizi"
              className="bg-pink-50 border text-pink-400 border-pink-200 px-2 py-2 w-24 rounded-md outline-none placeholder-pink-300"
            />
            <input
              type="text"
              value={product.barcode}
              onChange={(e) => setProduct({ ...product, barcode: e.target.value })}
              placeholder="Shtrix-kod (ixtiyoriy)"
              className="bg-pink-50 border text-pink-400 border-pink-200 px-2 py-2 flex-1 rounded-md outline-none placeholder-pink-300"
            />
          </div>
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
            className="bg-pink-500 hover:bg-pink-600 w-full text-white text-center py-2 font-bold rounded-md "
          >
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;
