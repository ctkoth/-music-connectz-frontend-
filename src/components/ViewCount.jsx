import { Eye } from "lucide-react";
import { useViewCount } from "../viewz.js";

// The public total, under a post or a profile. Absent until the count lands —
// a "0 views" that was really "not loaded yet" is a number that lies.
export default function ViewCount({ target, className = "" }) {
  const { n, notice } = useViewCount(target);
  if (n == null) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] text-white/45 ${className}`} title={notice}>
      <Eye size={12} /> {n.toLocaleString()} {n === 1 ? "view" : "views"}
    </span>
  );
}
