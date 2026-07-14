import { redirect } from "next/navigation";

/** كتالوج الطلب العام أُزيل من المنتج — إعادة توجيه لتسجيل الدخول. */
export default function CatalogPage() {
  redirect("/login");
}
