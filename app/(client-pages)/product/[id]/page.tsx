import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { ProductT } from "@/lib/types";
import { firstImageUrl } from "@/lib/images";
import ProductContent from '@/components/contents/ProductContent'

type tParams = Promise<{ id: string }>;

// Per-product SEO + Open Graph — so a shared product link (Telegram, social,
// search) shows the real title, description and image instead of a generic
// "Mega Home". Reads the product server-side at request time.
export async function generateMetadata(props: { params: tParams }): Promise<Metadata> {
  try {
    const { id } = await props.params;
    const snap = await getDoc(doc(fireDB, "products", id));
    if (!snap.exists()) return { title: "Mahsulot topilmadi — MegaHome" };
    const p = snap.data() as ProductT;
    const title = `${p.title} — MegaHome`;
    const description =
      (p.description || "").trim().slice(0, 160) ||
      "MegaHome — dekorativ uy jihozlari va anjomlari.";
    const img = firstImageUrl(p.productImageUrl);
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: img ? [{ url: img }] : undefined,
        type: "website",
      },
      twitter: {
        card: img ? "summary_large_image" : "summary",
        title,
        description,
        images: img ? [img] : undefined,
      },
    };
  } catch {
    return { title: "MegaHome" };
  }
}

export default async function Product(props: { params: tParams }) {
  const { id } = await props.params;
  return <ProductContent productID={id} />;
}
