import Link from "next/link";
import { useEffect, useState } from "react";
import Loader from "../Loader";
import { CiEdit } from "react-icons/ci";
import { MdDeleteForever } from "react-icons/md";
import { BsQrCode } from "react-icons/bs";
import useProductStore from "@/zustand/useProductStore";
import toast from "react-hot-toast";
import { ProductT } from "@/lib/types";
import { deleteObject, listAll, ref } from "firebase/storage";
import { FormattedPrice } from '@/utils'
import { fireStorage } from "@/firebase/FirebaseConfig";
import Image from "next/image";
import ProductRow from "./ProductRow";
import ProductImportExport from "./ProductImportExport";
import ProductQRCode from "./ProductQRCode";
import NoPhoto from "@/components/NoPhoto";
import { productUrl } from "@/lib/site";
import { FiLink } from "react-icons/fi";

const ProductDetail = () => {
    const { products, loading, fetchProducts, deleteProduct } = useProductStore();
    const [qrProduct, setQrProduct] = useState<ProductT | null>(null);
    const [search, setSearch] = useState("");

    // Live in-memory filter by title or category — the precondition for almost
    // every product action at a few hundred SKUs.
    const visible = products.filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.title ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
      );
    });

    const copyLink = async (id: string) => {
      try {
        await navigator.clipboard.writeText(productUrl(id));
        toast.success("Havola nusxalandi");
      } catch {
        toast.error("Nusxalab boʼlmadi");
      }
    };

    useEffect(() => {
      fetchProducts();
    }, [fetchProducts]);

    const handleDelete = async (item: ProductT) => {
      if (item.id) {
        const imageFolderRef = ref(fireStorage, `products/${item.storageFileId}`);
        const imageRefs = await listAll(imageFolderRef);
        
        const deleteImagePromises = imageRefs.items.map(async (itemRef) => {
          await deleteObject(itemRef);
        });
        await Promise.all(deleteImagePromises);

        await deleteProduct(item.id);
        toast.success('Product Deleted Successfully');
      }
    };

  return (
    <div>
      <div className="py-5 flex flex-wrap gap-3 justify-between items-center">
        {/* text  */}
        <h1 className=" text-xl text-pink-300 font-bold">All Product</h1>
        {/* Import / Export + Add Product  */}
        <div className="flex items-center gap-2 flex-wrap">
          <ProductImportExport />
          <Link
            href={"/admin-dashboard/qr-codes"}
            className="px-3 py-2 text-sm bg-white border border-pink-200 text-pink-500 rounded-lg hover:bg-pink-50 inline-flex items-center gap-1.5"
          >
            <BsQrCode className="text-base" /> QR kodlar
          </Link>
          <Link href={"/admin-dashboard/add-product"}>
            <button className="px-5 py-2 bg-pink-50 border border-pink-100 rounded-lg">
              Add Product
            </button>
          </Link>
        </div>
      </div>

      {/* Search  */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mahsulot izlash (nomi yoki kategoriya)..."
          className="w-full sm:max-w-md px-3 py-2 border border-pink-200 rounded-lg outline-none focus:ring-1 focus:ring-pink-300 text-slate-700 placeholder-slate-400"
        />
        {search && (
          <p className="text-xs text-slate-400 mt-1">{visible.length} ta mahsulot topildi</p>
        )}
      </div>

      {/* Loading  */}
      <div className="flex justify-center relative top-20">
        {loading && <Loader />}
      </div>
      {/* table  */}
      <div className="w-full overflow-x-auto mb-5">
        <table className="w-full text-left border border-collapse sm:border-separate border-pink-100 text-pink-400">
          <tbody>
            <tr>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100 font-bold fontPara">
                S.No.
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100 font-bold fontPara">
                Image
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100">
                Title
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100 min-w-24">
                Price
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100">
                Category
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100 min-w-24">
                {" "}
                Date
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100">
                isNew
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100">
                isBest
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100">
                QR / Havola
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100">
                Action
              </th>
              <th scope="col" className="h-12 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100">
                Action
              </th>
            </tr>
            {visible.map((item, index) => {
              const { id, title, price, category, date, productImageUrl } = item;
              return (
                <tr key={id} className="text-pink-300">
                  <td className="h-12 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 ">
                    {index + 1}.
                  </td>
                  <td className="h-12 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    <div className="flex justify-center">
                      {productImageUrl?.[0]?.url ? (
                        <Image width={80} height={80} className="w-20" src={productImageUrl[0].url} alt="" />
                      ) : (
                        <NoPhoto className="w-20 h-20 rounded" />
                      )}
                    </div>
                  </td>
                  <td className="h-12 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    {title}
                  </td>
                  <td className="h-12 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    {FormattedPrice(price)} UZS
                  </td>
                  <td className="h-12 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    {category}
                  </td>
                  <td className="h-12 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    {date.toString()}
                  </td>
                  <ProductRow item={item} />
                  <td className="h-12 px-4 lg:px-6 transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setQrProduct(item)} title="QR kod">
                        <BsQrCode className="text-slate-600 text-xl cursor-pointer hover:text-pink-500" />
                      </button>
                      <button onClick={() => copyLink(id)} title="Havolani nusxalash">
                        <FiLink className="text-slate-600 text-xl cursor-pointer hover:text-pink-500" />
                      </button>
                    </div>
                  </td>
                  <td className="h-12 px-4 lg:px-6 transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500">
                    <Link href={`/admin-dashboard/update-product/${id}`}><CiEdit className="text-green-500 text-2xl mx-auto cursor-pointer" /></Link>
                  </td>
                  <td className="h-12 px-4 lg:px-6 transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500">
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

      {/* QR kod oynasi */}
      {qrProduct && <ProductQRCode product={qrProduct} onClose={() => setQrProduct(null)} />}
    </div>
  );
};

export default ProductDetail;
