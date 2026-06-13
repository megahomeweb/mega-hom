"use client";
import toast from "react-hot-toast";
import { FiCopy, FiPhone } from "react-icons/fi";
import { FaTelegram } from "react-icons/fa";
import { formatPhone, telHref, telegramHref } from "@/utils/phone";

// Reusable one-tap customer contact cluster (Phase 1). Lives next to a phone
// number in the orders list today; reused by the customer CRM later.
// `stopPropagation` keeps clicks from toggling any surrounding accordion/row.
const ContactButtons = ({ phone, className = "" }: { phone: string; className?: string }) => {
  const tel = telHref(phone);
  const tg = telegramHref(phone);
  if (!tel) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatPhone(phone));
      toast.success("Raqam nusxalandi");
    } catch {
      toast.error("Nusxalab boʼlmadi");
    }
  };

  const btn =
    "inline-flex items-center justify-center size-8 rounded-full border transition-colors";

  return (
    <div className={`flex items-center gap-1.5 ${className}`} onClick={(e) => e.stopPropagation()}>
      <a
        href={tel}
        title="Qoʼngʼiroq qilish"
        className={`${btn} border-green-200 text-green-600 hover:bg-green-50`}
      >
        <FiPhone className="text-sm" />
      </a>
      {tg && (
        <a
          href={tg}
          target="_blank"
          rel="noopener noreferrer"
          title="Telegram orqali yozish"
          className={`${btn} border-blue-200 text-blue-500 hover:bg-blue-50`}
        >
          <FaTelegram className="text-sm" />
        </a>
      )}
      <button
        type="button"
        onClick={copy}
        title="Raqamni nusxalash"
        className={`${btn} border-slate-200 text-slate-500 hover:bg-slate-50`}
      >
        <FiCopy className="text-sm" />
      </button>
    </div>
  );
};

export default ContactButtons;
