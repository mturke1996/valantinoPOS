import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  DEFAULT_DELIVERY_ZONES,
  resolveDeliveryFee,
} from "@/lib/constants/delivery-zones";
import { generateId } from "@/lib/utils";

const MAX_LINE_ITEMS = 20;
const MAX_QTY_PER_LINE = 50;
const MAX_ORDERS_PER_WINDOW = 8;
const RATE_WINDOW_MS = 15 * 60 * 1000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request, phone: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${ip}:${phone}`;
}

function consumeRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_ORDERS_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isValidLibyaPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return (
    (digits.length === 10 && digits.startsWith("09")) ||
    (digits.length === 12 && digits.startsWith("2189")) ||
    (digits.length >= 8 && digits.length <= 15)
  );
}

export async function POST(request: Request) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "إرسال الطلبات غير مُعد حالياً" },
      { status: 503 },
    );
  }

  let body: {
    customerName?: string;
    customerPhone?: string;
    deliveryZone?: string | null;
    deliveryFee?: number;
    deliveryAddress?: string | null;
    notes?: string | null;
    items?: Array<{ productId: string; quantity: number }>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const customerName = body.customerName?.trim();
  const customerPhone = body.customerPhone?.trim();
  const items = body.items ?? [];

  if (!customerName || !customerPhone) {
    return NextResponse.json(
      { error: "الاسم والهاتف مطلوبان" },
      { status: 400 },
    );
  }
  if (!isValidLibyaPhone(customerPhone)) {
    return NextResponse.json({ error: "رقم الهاتف غير صالح" }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
  }
  if (items.length > MAX_LINE_ITEMS) {
    return NextResponse.json(
      { error: `الحد الأقصى ${MAX_LINE_ITEMS} صنفاً في الطلب` },
      { status: 400 },
    );
  }

  const rateKey = clientKey(request, customerPhone);
  if (!consumeRateLimit(rateKey)) {
    return NextResponse.json(
      { error: "تم تجاوز حد الطلبات، حاول لاحقاً" },
      { status: 429 },
    );
  }

  const { data: branches } = await admin.from("branches").select("id").limit(1);
  const branchId = branches?.[0]?.id as string | undefined;
  if (!branchId) {
    return NextResponse.json({ error: "لا يوجد فرع" }, { status: 404 });
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  if (productIds.length !== items.length) {
    return NextResponse.json(
      { error: "تكرار أصناف غير مسموح — ادمج الكميات" },
      { status: 400 },
    );
  }

  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, name_ar, retail_price, is_active, deleted_at")
    .eq("branch_id", branchId)
    .in("id", productIds);
  if (productsError) {
    console.error("[public/orders] products", productsError.message);
    return NextResponse.json({ error: "تعذر تحميل المنتجات" }, { status: 500 });
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
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json({ error: "كمية غير صالحة" }, { status: 400 });
    }
    if (qty > MAX_QTY_PER_LINE) {
      return NextResponse.json(
        { error: `الحد الأقصى للكمية ${MAX_QTY_PER_LINE} للصنف` },
        { status: 400 },
      );
    }
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

  // Never trust client deliveryFee — resolve from known zones.
  const deliveryFee = resolveDeliveryFee({
    zones: DEFAULT_DELIVERY_ZONES,
    zoneIdOrName: body.deliveryZone,
    defaultFee: 0,
    cartTotal: subtotal,
    freeDeliveryThreshold: null,
  });
  if (body.deliveryZone && deliveryFee === 0) {
    const known = DEFAULT_DELIVERY_ZONES.some(
      (z) => z.id === body.deliveryZone || z.name === body.deliveryZone,
    );
    if (!known) {
      return NextResponse.json(
        { error: "منطقة التوصيل غير معروفة" },
        { status: 400 },
      );
    }
  }

  const total = subtotal + deliveryFee;
  const orderId = generateId();
  const orderNumber = `WEB-${Date.now().toString().slice(-8)}`;
  const now = new Date().toISOString();

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
      console.error("[public/orders] customer", customerError.message);
      return NextResponse.json({ error: "تعذر حفظ العميل" }, { status: 500 });
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
      ? `[طلب أونلاين] ${body.notes}`.slice(0, 500)
      : "[طلب أونلاين]",
    created_at: now,
    updated_at: now,
  });
  if (orderError) {
    console.error("[public/orders] order", orderError.message);
    return NextResponse.json({ error: "تعذر إنشاء الطلب" }, { status: 500 });
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    lines.map((line) => ({
      ...line,
      branch_id: branchId,
      order_id: orderId,
    })),
  );
  if (itemsError) {
    console.error("[public/orders] items", itemsError.message);
    return NextResponse.json({ error: "تعذر حفظ بنود الطلب" }, { status: 500 });
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

  return NextResponse.json({ orderId, orderNumber, deliveryFee, total });
}
