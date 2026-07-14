"use client";
import useCartProductStore from "@/zustand/useCartStore";
import { useOrderStore } from "@/zustand/useOrderStore";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FormattedPrice } from "@/utils";
import { normalizePhone, formatPhone } from "@/utils/phone";
import Loader from "./Loader";

interface props {
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const SubmitModal = ({ setOpen }: props) => {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const { cartProducts, totalPrice, totalQuantity, clearBasket } = useCartProductStore();
  const { addOrder } = useOrderStore();
  // navigate
  const navigate = useRouter();

  // Close on Escape (but never mid-submit).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, setOpen]);

  // Prefill the phone for signed-in customers (stored normalized at signup).
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("users") ?? "{}");
      const digits = String(s.phone ?? "").replace(/\D/g, "");
      if (digits.length === 12 && digits.startsWith("998")) {
        const v = digits.slice(3);
        setPhoneNumber(`+998 (${v.slice(0, 2)}) ${v.slice(2, 5)}-${v.slice(5, 7)}-${v.slice(7)}`);
      }
    } catch {
      /* guest checkout */
    }
  }, []);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
    if (value.startsWith("998")) {
      value = value.slice(3); // Remove "998" from input if present
    }
    value = value.slice(0, 9); // Limit to 9 digits

    // Format the value as +998 (XX) XXX-XX-XX
    const formattedValue = value
      ? `+998 (${value.slice(0, 2)}) ${value.slice(2, 5)}${
          value.length > 5 ? "-" : ""
        }${value.slice(5, 7)}${value.length > 7 ? "-" : ""}${value.slice(7)}`
      : "";

    setPhoneNumber(formattedValue);
  };

  const handleSubmit = async () => {
    if (loading) return; // guard against a double-submit before the button disables
    if (cartProducts.length === 0) return toast.error("Savatingiz boʼsh");
    if (!firstName.trim() || !lastName.trim()) return toast.error("Ism va familyani toʼldiring");
    if (!normalizePhone(phoneNumber)) return toast.error("Telefon raqamini toʼliq kiriting");

    // Stamp the signed-in session (if any) onto the order so the CRM can join
    // this purchase to the registered account. Guests order exactly as before.
    let session: { uid?: string; email?: string } = {};
    try {
      session = JSON.parse(localStorage.getItem("users") ?? "{}");
    } catch {
      /* corrupt/absent session — order proceeds as guest */
    }

    const submitData = {
      id: "",
      clientName: firstName.trim(),
      clientLastName: lastName.trim(),
      clientPhone: formatPhone(phoneNumber),
      date: Timestamp.now(),
      basketItems: cartProducts,
      totalPrice: totalPrice,
      totalQuantity: totalQuantity,
      deliveryAddress: address.trim() || undefined,
      note: note.trim() || undefined,
      uid: session.uid || undefined,
      clientEmail: session.email || undefined,
    };
      
    try {
      setLoading(true);
      // Critical: persist the order. addOrder throws on failure, so a real
      // failure lands in catch instead of silently "succeeding".
      await addOrder(submitData);

      // Best-effort owner notification — must never block or fail checkout.
      try {
        await fetch("/api/notify-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            customer: `${firstName} ${lastName}`.trim(),
            phone: phoneNumber,
            total: FormattedPrice(totalPrice),
            items: cartProducts.map((p) => ({ title: p.title, quantity: p.quantity })),
          }),
        });
      } catch (notifyErr) {
        console.warn("Order notification skipped:", notifyErr);
      }

      clearBasket();
      setLoading(false);
      toast.success("Buyurtma yuborildi");
      navigate.push("/");
    } catch (error) {
      console.error(error);
      setLoading(false);
      toast.error("Buyurtmani yuborib boʼlmadi");
    }
  };

  return (
    <div className="fixed z-[9999] w-full h-full inset-0 flex items-center justify-center p-4">
      <div
        onClick={() => !loading && setOpen(false)}
        className="absolute inset-0 size-full bg-black/80 z-0"
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buyurtma maʼlumotlari"
        className="max-w-sm w-full bg-white rounded-xl space-y-3 p-5 z-10 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-bold text-slate-800">Buyurtma maʼlumotlari</h2>
        <div>
          <label
            htmlFor="first-name"
            className="block text-sm font-medium text-gray-900"
          >
            Ism
          </label>
          <div className="mt-1">
            <input
              id="first-name"
              name="first-name"
              type="text"
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:outline-none focus:ring-inset focus:ring-red-600 sm:text-sm px-2"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="last-name"
            className="block text-sm font-medium text-gray-900"
          >
            Familya
          </label>
          <div className="mt-1">
            <input
              id="last-name"
              name="last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:outline-none focus:ring-inset focus:ring-red-600 sm:text-sm px-2"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="phone-number"
            className="block text-sm font-medium text-gray-900"
          >
            Telefon
          </label>
          <div className="mt-1">
            <input
              id="phone-number"
              name="phone-number"
              type="text"
              inputMode="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:outline-none focus:ring-inset focus:ring-red-600 sm:text-sm px-2"
              placeholder="+998 (__) ___-__-__"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-900">
            Yetkazish manzili
          </label>
          <div className="mt-1">
            <input
              id="address"
              name="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shahar, koʼcha, uy (ixtiyoriy)"
              className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:outline-none focus:ring-inset focus:ring-red-600 sm:text-sm px-2"
            />
          </div>
        </div>
        <div>
          <label htmlFor="note" className="block text-sm font-medium text-gray-900">
            Izoh
          </label>
          <div className="mt-1">
            <input
              id="note"
              name="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Qoʼshimcha izoh (ixtiyoriy)"
              className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:outline-none focus:ring-inset focus:ring-red-600 sm:text-sm px-2"
            />
          </div>
        </div>

        <div className="pt-3 flex gap-2">
          <button
            onClick={() => setOpen(false)}
            type="button"
            disabled={loading}
            className="rounded-xl px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            Bekor
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 bg-brand transition-all ease-in-out hover:bg-brand-600 rounded-xl text-white p-2.5 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <div className="size-8"><Loader /></div> : "Buyurtmani Yuborish"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitModal;
