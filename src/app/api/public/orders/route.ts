import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { generateId } from "@/lib/utils";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "إرسال الطلبات غير مُعد — أضف SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    customerName?: string;
    customerPhone?: string;
    deliveryZone?: string | null;
    deliveryFee?: number;
    deliveryAddress?: string | null;
    notes?: string | null;
    items?: Array<{ productId: string; quantity: number }>;
  };

  const customerName = body.customerName?.trim();
  const customerPhone = body.customerPhone?.trim();
  const items = body.items ?? [];

  if (!customerName || !customerPhone) {
    return NextResponse.json(
      { error: "الاسم والهاتف مطلوبان" },
      { status: 400 },
    );
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
  }

  const { data: branches } = await admin
    .from("branches")
    .select("id")
    .limit(1);
  const branchId = branches?.[0]?.id as string | undefined;
  if (!branchId) {
    return NextResponse.json({ error: "لا يوجد فرع" }, { status: 404 });
  }

  const productIds = items.map((i) => i.productId);
  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, name_ar, retail_price, is_active, deleted_at")
    .eq("branch_id", branchId)
    .in("id", productIds);
  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const productMap = new Map((products ?? []).map((p) => [p.id as string, p]));
  const lines: Array<{
    id: string;
    product_id: string;
    product_name_ar: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total: number;
  }> = [];

  let subtotal = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || product.deleted_at || product.is_active === false) {
      return NextResponse.json(
        { error: "صنف غير متاح في الطلب" },
        { status: 400 },
      );
    }
    const qty = Math.max(1, Math.floor(item.quantity));
    const unit = Number(product.retail_price);
    const lineTotal = unit * qty;
    subtotal += lineTotal;
    lines.push({
      id: generateId(),
      product_id: product.id as string,
      product_name_ar: product.name_ar as string,
      quantity: qty,
      unit_price: unit,
      discount: 0,
      total: lineTotal,
    });
  }

  const deliveryFee = Math.max(0, Number(body.deliveryFee) || 0);
  const total = subtotal + deliveryFee;
  const orderId = generateId();
  const orderNumber = `WEB-${Date.now().toString().slice(-8)}`;
  const now = new Date().toISOString();

  // Upsert customer by phone
  let customerId: string | null = null;
  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("branch_id", branchId)
    .eq("phone", customerPhone)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingCustomer?.id) {
    customerId = existingCustomer.id as string;
  } else {
    customerId = generateId();
    const { error: customerError } = await admin.from("customers").insert({
      id: customerId,
      branch_id: branchId,
      name: customerName,
      phone: customerPhone,
      whatsapp: customerPhone,
      loyalty_points: 0,
      total_spent: 0,
      order_count: 0,
      wholesale_pricing: false,
      created_at: now,
      updated_at: now,
    });
    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }
  }

  const { error: orderError } = await admin.from("orders").insert({
    id: orderId,
    branch_id: branchId,
    order_number: orderNumber,
    customer_id: customerId,
    type: "delivery",
    status: "received",
    subtotal,
    discount_amount: 0,
    tax_amount: 0,
    total,
    paid_amount: 0,
    payment_status: "unpaid",
    delivery_fee: deliveryFee,
    delivery_zone: body.deliveryZone ?? null,
    delivery_address: body.deliveryAddress ?? null,
    delivery_phone: customerPhone,
    delivery_recipient_name: customerName,
    notes: body.notes
      ? `[طلب أونلاين] ${body.notes}`
      : "[طلب أونلاين]",
    created_at: now,
    updated_at: now,
  });
  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    lines.map((line) => ({
      ...line,
      branch_id: branchId,
      order_id: orderId,
    })),
  );
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  await admin.from("order_status_history").insert({
    id: generateId(),
    branch_id: branchId,
    order_id: orderId,
    from_status: null,
    to_status: "received",
    changed_at: now,
    notes: "طلب من الكتالوج العام",
  });

  return NextResponse.json({ orderId, orderNumber });
}
