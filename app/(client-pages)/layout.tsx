import CartButton from "@/components/CartButton";
import MegaBuddyLazy from "@/components/client/MegaBuddyLazy";
import Contact from "@/components/client/Contact";
import Delivery from "@/components/client/Delivery";
import Footer from "@/components/client/Footer";
import Header from "@/components/client/Header";
import NewProducts from "@/components/client/NewProducts";
import Partners from "@/components/client/Partners";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mega Home",
  description: "",
};

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <>
      <Header />
      <main className="bg-body min-h-screen">
        {children}
        <NewProducts />
        <Partners />
        <Delivery />
        <Contact />
        <CartButton />
        <MegaBuddyLazy />
      </main>
      <Footer />
    </>
  );
}
