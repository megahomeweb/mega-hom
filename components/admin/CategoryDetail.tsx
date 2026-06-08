import useCategoryStore from "@/zustand/useCategoryStore";
import Link from "next/link";
import { MdDeleteForever } from "react-icons/md";
import Loader from "../Loader";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { CategoryI } from "@/lib/types";
import CategoryImportExport from "./CategoryImportExport";

const CategoryDetail = () => {
  const { categories, fetchCategories, loading, deleteCategory } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async (item: CategoryI) => {
    if (item.id) {
      deleteCategory(item.id);
      toast.success("Product Deleted Successfully");
    }
  };  

  return (
    <div>
      <div>
        <div className="py-5 flex flex-wrap gap-3 justify-between items-center">
          {/* text  */}
          <h1 className=" text-xl text-pink-300 font-bold">All Category</h1>
          {/* Import / Export + Add Category  */}
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryImportExport />
            <Link href={"/admin-dashboard/add-category"}>
              <button className="px-5 py-2 bg-pink-50 border border-pink-100 rounded-lg">
                Add Category
              </button>
            </Link>
          </div>
        </div>
        {/* Loading  */}
        <div className="flex justify-center relative top-20">
          {loading && <Loader />}
        </div>
        {/* table  */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border border-collapse sm:border-separate border-pink-100 text-pink-400">
            <tbody>
              <tr>
                <th
                  scope="col"
                  className="py-2 px-4 lg:px-6 text-md border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100 font-bold fontPara"
                >
                  S.No.
                </th>
                <th
                  scope="col"
                  className="py-2 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100"
                >
                  Category Name
                </th>
                <th
                  scope="col"
                  className="py-2 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100"
                >
                  Sub Categories
                </th>
                <th
                  scope="col"
                  className="py-2 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-pink-100 text-slate-700 bg-slate-100"
                >
                  Delete
                </th>
              </tr>
              {categories.map((item, idx) => (
                <tr key={idx} className="text-pink-300">
                  <td className="py-2 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 ">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    {item.name}
                  </td>
                  <td className="flex items-center gap-2 flex-wrap py-2 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    {item.subcategory.map((tag,idx) => (
                      <span
                        key={idx}
                        className={`rounded-md transition-all ease-in-out py-1 px-4 bg-gray-300`}
                      >
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td className="py-2 px-4 lg:px-6 transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500">
                    <button onClick={() => handleDelete(item)}>
                      <MdDeleteForever className="text-red-500 text-2xl mx-auto cursor-pointer" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetail;
