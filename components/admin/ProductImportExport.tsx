"use client";
import { collection, doc, Timestamp, writeBatch } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { fireDB } from "@/firebase/FirebaseConfig";
import useProductStore from "@/zustand/useProductStore";
import {
  ImportProduct,
  num,
  parseBool,
  parseProductsFile,
  productsToCSV,
  productsToJSON,
} from "@/utils/importExport";
import ImportExport, { ImportResult } from "./ImportExport";

// Imported image URLs must come from a domain allow-listed in next.config.ts,
// otherwise <Image> (used in the product table) throws at render time.
const ALLOWED_IMAGE_HOSTS = ["firebasestorage.googleapis.com", "cdn-icons-png.flaticon.com"];

const hostAllowed = (url: string): boolean => {
  try {
    return ALLOWED_IMAGE_HOSTS.includes(new URL(url).host);
  } catch {
    return false;
  }
};

// Matches the date format produced by the Add Product page.
const formatDate = (): string =>
  new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const toTimestamp = (value: unknown): Timestamp => {
  try {
    if (!value) return Timestamp.now();
    if (typeof value === "number") return Timestamp.fromMillis(value < 1e12 ? value * 1000 : value);
    if (typeof value === "string") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? Timestamp.now() : Timestamp.fromDate(d);
    }
    const v = value as { seconds?: number; nanoseconds?: number };
    if (typeof v.seconds === "number") return new Timestamp(v.seconds, v.nanoseconds ?? 0);
    return Timestamp.now();
  } catch {
    return Timestamp.now();
  }
};

const FIRESTORE_BATCH_LIMIT = 400;

const ProductImportExport = () => {
  const { products } = useProductStore();

  const commitImport = async (items: ImportProduct[]): Promise<ImportResult> => {
    const existingIds = new Set(products.map((p) => p.id));
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge: boolean }[] = [];

    items.forEach((rec, i) => {
      const rowNum = i + 1;
      const title = rec.title.trim();
      if (!title) {
        skipped++;
        errors.push(`Qator ${rowNum}: nomi yoʼq — oʼtkazib yuborildi`);
        return;
      }

      const base = {
        title,
        price: num(rec.price),
        quantity: num(rec.quantity),
        category: rec.category,
        subCategory: rec.subCategory,
        description: rec.description,
        isNew: parseBool(rec.isNew),
        isBest: parseBool(rec.isBest),
      };

      if (rec.id && existingIds.has(rec.id)) {
        // Update an existing product. Images / storage / time are preserved.
        const data: Record<string, unknown> = { ...base };
        if (typeof rec.date === "string" && rec.date) data.date = rec.date;
        ops.push({ ref: doc(fireDB, "products", rec.id), data, merge: true });
        updated++;
        return;
      }

      // Create — either restore at an explicit id, or a brand-new auto id.
      const images = rec.productImageUrl.filter((im) => hostAllowed(im.url));
      if (images.length === 0) {
        skipped++;
        errors.push(
          `Qator ${rowNum} ("${title}"): yangi mahsulot uchun saytdagi rasm URL kerak — oʼtkazib yuborildi`
        );
        return;
      }
      const ref = rec.id ? doc(fireDB, "products", rec.id) : doc(collection(fireDB, "products"));
      ops.push({
        ref,
        data: {
          ...base,
          productImageUrl: images,
          time: toTimestamp(rec.time),
          date: typeof rec.date === "string" && rec.date ? rec.date : formatDate(),
          storageFileId: rec.storageFileId || uuidv4(),
        },
        merge: false,
      });
      created++;
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
      onExportCSV={() => productsToCSV(products)}
      onExportJSON={() => productsToJSON(products)}
      parseFile={parseProductsFile}
      commitImport={commitImport}
      importHint="CSV: mavjud mahsulotlar id boʼyicha yangilanadi (rasm/zaxira oʼzgarmaydi). Yangi qatorlar uchun saytdagi (Firebase) rasm URL talab qilinadi. JSON — toʼliq zaxira nusxa va uni tiklash uchun."
    />
  );
};

export default ProductImportExport;
