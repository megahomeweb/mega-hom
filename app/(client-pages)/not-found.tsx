import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4 gap-4">
      <p className="text-5xl font-brand font-extrabold text-brand">404</p>
      <p className="text-lg font-medium text-slate-700">Sahifa topilmadi</p>
      <p className="text-slate-500 max-w-md">
        Siz qidirgan sahifa mavjud emas yoki koʼchirilgan boʼlishi mumkin.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-brand hover:bg-brand-600 transition-colors text-white px-5 py-2.5 font-semibold"
      >
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
