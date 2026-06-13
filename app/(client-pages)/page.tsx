import Hero from "@/components/client/Hero";
import Populars from "@/components/client/Populars";
import NewProducts from "@/components/client/NewProducts";
import BestSellers from "@/components/client/BestSellers";
import AllProducts from "@/components/client/AllProducts";

export default function Home() {
  return (
    <div>
      <Hero />
      <Populars />
      <NewProducts />
      <BestSellers />
      <AllProducts />
    </div>
  );
}
