"use client";
import { doc, writeBatch } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import useCustomerStore from "@/zustand/useCustomerStore";
import {
  ImportCustomer,
  buildCustomerWrite,
  customersToCSV,
  detectCustomerColumns,
  parseCustomersFile,
  planCustomerImport,
} from "@/utils/importExport";
import ImportExport, { ImportResult } from "./ImportExport";

const FIRESTORE_BATCH_LIMIT = 400;

// Customer CSV/Excel import-export. Keyed by normalized phone (doc.id), so a
// re-import patches the same customer doc. Only enrichment (name/city/tags/note)
// is written; order metrics in the export are read-only.
const CustomerImportExport = () => {
  const { customers } = useCustomerStore();

  const commitImport = async (items: ImportCustomer[], enabled: Set<string>): Promise<ImportResult> => {
    const existing = new Set(customers.map((c) => c.phone));
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const ops: { phone: string; data: Record<string, unknown> }[] = [];

    items.forEach((rec, i) => {
      const rowNum = i + 2;
      if (!rec.phone) {
        skipped++;
        errors.push(`Qator ${rowNum}: telefon raqami notoʼgʼri — oʼtkazib yuborildi`);
        return;
      }
      const data = buildCustomerWrite(rec, enabled);
      if (!Object.keys(data).length) {
        skipped++;
        return;
      }
      ops.push({ phone: rec.phone, data });
      if (existing.has(rec.phone)) updated++;
      else created++;
    });

    for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(fireDB);
      for (const op of ops.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
        batch.set(doc(fireDB, "customers", op.phone), { ...op.data, phone: op.phone }, { merge: true });
      }
      await batch.commit();
    }

    return { created, updated, skipped, errors };
  };

  return (
    <ImportExport<ImportCustomer>
      entityLabel="customers"
      importAccept=".csv,.xlsx,.xls,.json"
      onExportCSV={() => customersToCSV(customers)}
      parseFile={parseCustomersFile}
      detectColumns={detectCustomerColumns}
      planImport={(items, enabled) =>
        planCustomerImport(items, new Set(customers.map((c) => c.phone)), enabled)
      }
      commitImport={commitImport}
      importHint="Telefon raqami boʼyicha mijozlar qoʼshiladi/yangilanadi (Ism, Email, Shahar, Belgilar, Izoh). Belgilarni vergul bilan ajrating. Buyurtma soni/summasi import qilinmaydi — ular buyurtmalardan hisoblanadi."
    />
  );
};

export default CustomerImportExport;
