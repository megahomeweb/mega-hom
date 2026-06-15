import OrderContent from "@/components/contents/OrderContent"
import Link from "next/link"
import { GoArrowLeft } from "react-icons/go"


const Orders = () => {

  return (
    <main className="bg-body min-h-screen">
      <div className="max-w-7xl mx-auto px-4 lg:px-10 pb-24">
        <Link
          href="/admin-dashboard"
          className="flex items-center gap-1 w-fit text-gray-500 text-sm transition-all ease-in-out hover:text-brand py-4"
        >
          <GoArrowLeft className="text-xl" />
          <span>Orqaga</span>
        </Link>
        <OrderContent />
      </div>
    </main>
  )
}

export default Orders