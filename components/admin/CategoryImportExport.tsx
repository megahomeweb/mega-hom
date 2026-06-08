"use client";
import { collection, doc, writeBatch } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import useCategoryStore from "@/zustand/useCategoryStore";
import {
  categoriesToCSV,
  categoriesToJSON,
  ImportCategory,
  parseCategoriesFile,
} from "@/utils/importExport";
import ImportExport, { ImportResult } from "./ImportExport";

const FIRESTORE_BATCH_LIMIT = 400;

const CategoryImportExport = () => {
  const { categories } = useCategoryStore();

  const commitImport = async (items: ImportCategory[]): Promise<ImportResult> => {
    const existingIds = new Set(categories.map((c) => c.id));
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge: boolean }[] = [];

    items.forEach((rec, i) => {
      const rowNum = i + 1;
      if (!rec.name) {
        skipped++;
        errors.push(`Qator ${rowNum}: kategoriya nomi yoʼq — oʼtkazib yuborildi`);
        return;
      }
      const data = { name: rec.name, subcategory: rec.subcategory };
      if (rec.id && existingIds.has(rec.id)) {
        ops.push({ ref: doc(fireDB, "categories", rec.id), data, merge: true });
        updated++;
      } else {
        const ref = rec.id ? doc(fireDB, "categories", rec.id) : doc(collection(fireDB, "categories"));
        ops.push({ ref, data, merge: false });
        created++;
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
    <ImportExport<ImportCategory>
      entityLabel="categories"
      onExportCSV={() => categoriesToCSV(categories)}
      onExportJSON={() => categoriesToJSON(categories)}
      parseFile={parseCategoriesFile}
      commitImport={commitImport}
      importHint="Subkategoriyalarni '|' bilan ajrating (masalan: stol | stul). id boʼlsa kategoriya yangilanadi, boʼlmasa yangisi qoʼshiladi."
    />
  );
};

export default CategoryImportExport;
