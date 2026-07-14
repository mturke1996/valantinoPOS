import { redirect } from "next/navigation";

/** شاشة التحضير أُزيلت من المنتج — إعادة توجيه للطلبات. */
export default function KitchenPage() {
  redirect("/orders");
}
