import Hero from "@/components/client/Hero";
import Populars from "@/components/client/Populars";
import NewProducts from "@/components/client/NewProducts";
import BestSellers from "@/components/client/BestSellers";
import AllProducts from "@/components/client/AllProducts";
import Partners from "@/components/client/Partners";
import Delivery from "@/components/client/Delivery";
import Contact from "@/components/client/Contact";

export default function Home() {
  return (
    // Subtle brand glow anchored at the very top that fades to transparent
    // before the product grids — adds warmth behind the hero without washing
    // out any product image below it.
    <div className="bg-[radial-gradient(110%_540px_at_50%_-8%,rgba(194,26,26,0.10),rgba(255,190,150,0.05)_42%,transparent_72%)]">
      <Hero />
      <Populars />
      <NewProducts />
      <BestSellers />
      {/* Anchor targets for the storefront nav (Header PRIMARY_LINKS). */}
      <section id="mahsulotlar" className="scroll-mt-4">
        <AllProducts />
      </section>
      <Partners />
      <Delivery />
      <section id="aloqa" className="scroll-mt-4">
        <Contact />
      </section>
    </div>
  );
}
