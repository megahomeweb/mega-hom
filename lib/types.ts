import { Timestamp } from "firebase/firestore";
import { OrderStatus } from "./orderStatus";

export interface ProductT {
  id: string;
  title: string;
  price: number;
  productImageUrl: ImageT[];
  category: string;
  subCategory:string;
  description: string;
  quantity: number;
  isBest: boolean;
  isNew: boolean
  isHidden?: boolean; // true = kept in admin but hidden from the storefront
  time: Timestamp;
  date: Timestamp;
  storageFileId: string;
}

export interface CategoryI {
  id: string;
  name: string;
  subcategory: string[]
}

export interface ImageT {
  url: string;
  path: string;
}

export interface Order {
  id: string;
  clientName: string;
  clientLastName: string;
  clientPhone: string;
  date: Timestamp;
  basketItems: ProductT[];
  totalPrice: number;
  totalQuantity: number;
  status?: OrderStatus;
}

export interface  userT {
  name: string;
  email: string | null;
  uid: string;
  role: string;
  time: Timestamp;
  date: string;
}

// Derived customer (computed from orders, keyed by normalized phone; enriched
// by the optional `customers` collection). Never stored as-is.
export interface CustomerT {
  phone: string;        // normalized key, e.g. 998901234567 ("no-phone" bucket otherwise)
  displayPhone: string; // pretty +998 .. (or "Telefonsiz")
  name: string;
  orderCount: number;
  totalSpent: number;
  totalItems: number;
  avgTicket: number;
  firstOrderAt: number | null; // ms epoch
  lastOrderAt: number | null;  // ms epoch
  orders: Order[];
  tags: string[];
  note: string;
  city: string;
}