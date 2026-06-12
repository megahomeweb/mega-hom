"use client";
import { collection, doc, writeBatch } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import useCategoryStore from "@/zustand/useCategoryStore";
import {
  ImportCategory,
  buildCategoryWrite,
  categoriesToCSV,
  detectCategoryColumns,
  parseCategoriesFile,
  planCategoryImport,
} from "@/utils/importExport";
import ImportExport, { ImportResult } from "./ImportExport";

const FIRESTORE_BATCH_LIMIT = 400;

const CategoryImportExport = () => {
  const { categories } = useCategoryStore();

  const commitImport = async (items: ImportCategory[], enabled: Set<string>): Promise<ImportResult> => {
    const existingIds = new Set(categories.map((c) => c.id));
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge: boolean }[] = [];

    items.forEach((rec, i) => {
      const rowNum = i + 2; // matches the row number the user sees in Excel (row 1 = headers)
      const provided = buildCategoryWrite(rec, enabled);

      if (rec.id && existingIds.has(rec.id)) {
        if (!Object.keys(provided).length) {
          skipped++; // nothing filled in — leave the category untouched
          return;
        }
        ops.push({ ref: doc(fireDB, "categories", rec.id), data: provided, merge: true });
        updated++;
        return;
      }

      if (!provided.name) {
        skipped++;
        errors.push(`Qator ${rowNum}: yangi kategoriya uchun nomi (Name) kerak`);
        return;
      }
      const ref = rec.id ? doc(fireDB, "categories", rec.id) : doc(collection(fireDB, "categories"));
      ops.push({
        ref,
        data: { name: provided.name, subcategory: provided.subcategory ?? [] },
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
    <ImportExport<ImportCategory>
      entityLabel="categories"
      importAccept=".csv,.xlsx,.xls,.json"
      onExportCSV={() => categoriesToCSV(categories)}
      parseFile={parseCategoriesFile}
      detectColumns={detectCategoryColumns}
      planImport={(items, enabled) =>
        planCategoryImport(items, new Set(categories.map((c) => c.id)), enabled)
      }
      commitImport={commitImport}
      importHint="Subkategoriyalarni '|' bilan ajrating (masalan: stol | stul). 'Category ID' boʼlsa kategoriya yangilanadi, boʼsh boʼlsa yangisi qoʼshiladi. Boʼsh kataklar mavjud maʼlumotni oʼzgartirmaydi."
    />
  );
};

export default CategoryImportExport;
