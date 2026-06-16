import CartButton from "@/components/CartButton";
import MegaBuddyLazy from "@/components/client/MegaBuddyLazy";
import Footer from "@/components/client/Footer";
import Header from "@/components/client/Header";
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
        <CartButton />
        <MegaBuddyLazy />
      </main>
      <Footer />
    </>
  );
}
