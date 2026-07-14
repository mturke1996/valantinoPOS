import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { DEFAULT_DELIVERY_ZONES } from "@/lib/constants/delivery-zones";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "الكتالوج العام غير مُعد — أضف SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 },
    );
  }

  const { data: branches } = await admin
    .from("branches")
    .select("id, name")
    .limit(1);
  const branch = branches?.[0];
  if (!branch) {
    return NextResponse.json({ error: "لا يوجد فرع" }, { status: 404 });
  }

  const [{ data: products }, { data: categories }, { data: settingsRows }] =
    await Promise.all([
      admin
        .from("products")
        .select(
          "id, name_ar, retail_price, image_url, category_id, is_active, deleted_at",
        )
        .eq("branch_id", branch.id)
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name_ar"),
      admin
        .from("categories")
        .select("id, name_ar")
        .eq("branch_id", branch.id),
      admin
        .from("settings")
        .select("key, value")
        .eq("branch_id", branch.id),
    ]);

  const categoryMap = new Map(
    (categories ?? []).map((c) => [c.id as string, c.name_ar as string]),
  );
  const app = settingsRows?.find((r) => r.key === "app")?.value as
    | Record<string, unknown>
    | undefined;

  return NextResponse.json({
    branchName: branch.name,
    currencySymbol:
      typeof app?.currencySymbol === "string" ? app.currencySymbol : "د.ل",
    zones: Array.isArray(app?.deliveryZones)
      ? app.deliveryZones
      : DEFAULT_DELIVERY_ZONES,
    products: (products ?? []).map((p) => ({
      id: p.id,
      nameAr: p.name_ar,
      retailPrice: Number(p.retail_price),
      imageUrl: p.image_url,
      categoryName: p.category_id
        ? categoryMap.get(p.category_id as string) ?? null
        : null,
    })),
  });
}
