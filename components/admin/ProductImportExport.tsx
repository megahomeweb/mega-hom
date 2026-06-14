"use client";
import { collection, doc, Timestamp, writeBatch } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { fireDB } from "@/firebase/FirebaseConfig";
import useProductStore from "@/zustand/useProductStore";
import {
  ImportProduct,
  buildProductWrite,
  detectProductColumns,
  parseProductsFile,
  planProductImport,
  productsToCSV,
} from "@/utils/importExport";
import ImportExport, { ImportResult } from "./ImportExport";

const FIRESTORE_BATCH_LIMIT = 400;

// Forgiving CSV/Excel import:
//  - a row with a known "Product ID" updates that product — but only the cells
//    that are filled in (and only the columns the user left enabled);
//  - a row with an empty "Product ID" creates a new product (photos are added
//    later from the edit page);
//  - blank cells / missing columns never overwrite existing data, and a bad
//    row is skipped on its own without blocking the rest of the file.
const ProductImportExport = () => {
  const { products } = useProductStore();

  const commitImport = async (items: ImportProduct[], enabled: Set<string>): Promise<ImportResult> => {
    const existingIds = new Set(products.map((p) => p.id));
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge: boolean }[] = [];

    items.forEach((rec, i) => {
      const rowNum = i + 2; // +2 → matches the row number the user sees in Excel (row 1 = headers)

      // Row whose Product ID matches the store → update only the filled-in cells.
      if (rec.id && existingIds.has(rec.id)) {
        const data = buildProductWrite(rec, enabled);
        if (!Object.keys(data).length) {
          skipped++; // nothing filled in — leave the product untouched, no complaint
          return;
        }
        ops.push({ ref: doc(fireDB, "products", rec.id), data, merge: true });
        updated++;
        return;
      }

      // Any other row (blank ID, or an ID that isn't in the store) → new product.
      // Only a Title is required; a stale/unknown ID is reported but not blocked.
      const provided = buildProductWrite(rec, enabled);
      if (!provided.title) {
        skipped++;
        errors.push(`Qator ${rowNum}: yangi mahsulot uchun kamida nomi (Title) kerak — oʼtkazib yuborildi`);
        return;
      }
      ops.push({
        ref: doc(collection(fireDB, "products")),
        merge: false,
        data: {
          // defaults first, then whatever the file provided on top
          price: 0,
          costPrice: 0,
          quantity: 0,
          category: "",
          subCategory: "",
          description: "",
          isNew: false,
          isBest: false,
          ikpu: "",
          vatRate: 12,
          barcode: "",
          ...provided,
          productImageUrl: rec.images ?? [],
          storageFileId: uuidv4(),
          time: Timestamp.now(),
          date: new Date().toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
        },
      });
      created++;
      if (rec.id) {
        errors.push(
          `Qator ${rowNum} ("${provided.title}"): "${rec.id}" IDʼli mahsulot topilmadi — yangi mahsulot sifatida qoʼshildi`
        );
      }
    });

    for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(fireDB);
      for (const op of ops.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
        batch.set(op.ref, op.data, op.merge ? { merge: true } : {});
      }
      await batch.commit();
    }

    return { created, updated, skipped, errors };
  };

  return (
    <ImportExport<ImportProduct>
      entityLabel="products"
      importAccept=".csv,.xlsx,.xls,.json"
      onExportCSV={() => productsToCSV(products)}
      parseFile={parseProductsFile}
      detectColumns={detectProductColumns}
      planImport={(items, enabled) =>
        planProductImport(items, new Set(products.map((p) => p.id)), enabled)
      }
      commitImport={commitImport}
      importHint="Excel (.xlsx) yoki CSV boʼladi. Faqat toʼldirilgan kataklar yoziladi — boʼsh katak mahsulotni buzmaydi. 'Product ID' boʼsh boʼlsa yangi mahsulot qoʼshiladi, rasmlarini keyin tahrirlash sahifasida yuklaysiz."
    />
  );
};

export default ProductImportExport;
