import { FiImage } from "react-icons/fi";

/** Neutral "no photo yet" placeholder for products created without images
 *  (e.g. via CSV/Excel import) — photos are added later from the edit page. */
const NoPhoto = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}>
    <FiImage className="w-1/3 h-1/3 max-w-10 max-h-10" />
  </div>
);

export default NoPhoto;
