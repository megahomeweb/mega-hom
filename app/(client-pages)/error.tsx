"use client";
import { useEffect } from "react";

// Route error boundary for the storefront — a failed data fetch now shows a
// retry affordance instead of a blank page or an infinite spinner.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4 gap-4">
      <p className="text-2xl font-brand font-bold text-brand">Nimadir xato ketdi</p>
      <p className="text-slate-500 max-w-md">
        Sahifani yuklab boʼlmadi. Iltimos, qaytadan urinib koʼring.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-brand hover:bg-brand-600 transition-colors text-white px-5 py-2.5 font-semibold"
      >
        Qayta urinish
      </button>
    </div>
  );
}
