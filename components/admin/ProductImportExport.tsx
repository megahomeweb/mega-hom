"use client";
import { doc, writeBatch } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import useProductStore from "@/zustand/useProductStore";
import { ImportProduct, num, parseBool, parseProductsFile, productsToCSV } from "@/utils/importExport";
import ImportExport, { ImportResult } from "./ImportExport";

const FIRESTORE_BATCH_LIMIT = 400;

// CSV import updates existing products matched by "Product ID". Images, the
// storage folder and the sort timestamp are left untouched. Creating brand-new
// products (which need real image uploads) is done from the "Add Product" page.
const ProductImportExport = () => {
  const { products } = useProductStore();

  const commitImport = async (items: ImportProduct[]): Promise<ImportResult> => {
    const existingIds = new Set(products.map((p) => p.id));
    const errors: string[] = [];
    let updated = 0;
    let skipped = 0;

    const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];

    items.forEach((rec, i) => {
      const rowNum = i + 1;
      const title = rec.title.trim();
      if (!title) {
        skipped++;
        errors.push(`Qator ${rowNum}: nomi boʼsh — oʼtkazib yuborildi`);
        return;
      }
      if (!rec.id || !existingIds.has(rec.id)) {
        skipped++;
        errors.push(
          `Qator ${rowNum} ("${title}"): mavjud mahsulot topilmadi — yangi mahsulotni "Add Product" orqali qoʼshing`
        );
        return;
      }
      ops.push({
        ref: doc(fireDB, "products", rec.id),
        data: {
          title,
          price: num(rec.price),
          quantity: num(rec.quantity),
          category: rec.category,
          subCategory: rec.subCategory,
          description: rec.description,
          isNew: parseBool(rec.isNew),
          isBest: parseBool(rec.isBest),
        },
      });
      updated++;
    });

    for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(fireDB);
      for (const op of ops.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
        batch.set(op.ref, op.data, { merge: true });
      }
      await batch.commit();
    }

    return { created: 0, updated, skipped, errors };
  };

  return (
    <ImportExport<ImportProduct>
      entityLabel="products"
      importAccept=".csv"
      onExportCSV={() => productsToCSV(products)}
      parseFile={parseProductsFile}
      commitImport={commitImport}
      importHint="CSV mavjud mahsulotlarni 'Product ID' boʼyicha yangilaydi (narx, soni, nomi, kategoriya, tavsif, New/Best). Rasmlar oʼzgarmaydi. Yangi mahsulot qoʼshish uchun 'Add Product' tugmasidan foydalaning."
    />
  );
};

export default ProductImportExport;
