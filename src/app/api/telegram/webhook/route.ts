import { NextResponse } from "next/server";

import {
  createTelegramAdminClient,
  deactivateTelegramSubscriber,
  resolveDefaultBranchId,
  upsertTelegramSubscriber,
} from "@/lib/telegram/admin";
import {
  resolveTelegramBotToken,
  resolveTelegramWebhookSecret,
} from "@/lib/telegram/config";
import {
  formatUpcomingDigest,
  sendTelegramMessage,
} from "@/lib/telegram/bot";

interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string; title?: string; username?: string };
    from?: { first_name?: string; username?: string };
  };
}

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

async function loadUpcomingForBranch(branchId: string) {
  const admin = createTelegramAdminClient();
  if (!admin) return [];

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 7);
  const horizonDate = horizon.toISOString().slice(0, 10);

  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, order_number, delivery_date, delivery_time, delivery_address, status, total, paid_amount, customer_id",
    )
    .eq("branch_id", branchId)
    .not("delivery_date", "is", null)
    .gte("delivery_date", today)
    .lte("delivery_date", horizonDate)
    .not("status", "in", "(cancelled,completed)")
    .order("delivery_date", { ascending: true })
    .limit(40);

  if (!orders?.length) return [];

  const customerIds = [
    ...new Set(
      orders
        .map((o) => o.customer_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: customers } = customerIds.length
    ? await admin.from("customers").select("id, name").in("id", customerIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const customerMap = new Map(
    (customers ?? []).map((c) => [String(c.id), String(c.name)]),
  );

  const orderIds = orders.map((o) => String(o.id));
  const { data: items } = await admin
    .from("order_items")
    .select("order_id, product_name_ar, quantity")
    .in("order_id", orderIds);

  const itemsByOrder = new Map<string, string[]>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(String(item.order_id)) ?? [];
    list.push(`${item.product_name_ar} ×${item.quantity}`);
    itemsByOrder.set(String(item.order_id), list);
  }

  return orders.map((order) => {
    const lines = itemsByOrder.get(String(order.id)) ?? [];
    const deliveryDate = String(order.delivery_date);
    const deliveryTime = order.delivery_time
      ? String(order.delivery_time).slice(0, 5)
      : null;
    const target = new Date(
      `${deliveryDate}T${deliveryTime ?? "12:00"}`,
    ).getTime();
    const msUntil = target - Date.now();
    const daysUntil = Math.max(0, Math.ceil(msUntil / (24 * 60 * 60 * 1000)));
    const urgencyLabel =
      msUntil <= 2 * 60 * 60 * 1000
        ? "عاجل الآن"
        : daysUntil <= 0
          ? "اليوم"
          : daysUntil === 1
            ? "غداً"
            : daysUntil <= 3
              ? "خلال 3 أيام"
              : "خلال الأسبوع";
    const countdownLabel =
      msUntil <= 0
        ? "الآن"
        : daysUntil <= 0
          ? "اليوم"
          : daysUntil === 1
            ? "غداً"
            : `خلال ${daysUntil} أيام`;

    return {
      orderNumber: String(order.order_number),
      customerName: order.customer_id
        ? (customerMap.get(String(order.customer_id)) ?? "عميل")
        : "عميل نقدي",
      deliveryDate,
      deliveryTime,
      countdownLabel,
      urgencyLabel,
      itemSummary: lines.slice(0, 3).join("، "),
      itemCount: lines.length,
      id: String(order.id),
      status: String(order.status),
      total: Number(order.total ?? 0),
      paidAmount: Number(order.paid_amount ?? 0),
      deliveryAddress: order.delivery_address
        ? String(order.delivery_address)
        : null,
      currencySymbol: "د.ل",
    };
  });
}

export async function POST(request: Request) {
  const token = await resolveTelegramBotToken();
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const secret = await resolveTelegramWebhookSecret();
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) return unauthorized();
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text.trim();
  const command = text.split(/\s+/)[0]?.toLowerCase().split("@")[0] ?? "";

  try {
    if (command === "/start") {
      const branchId = await resolveDefaultBranchId();
      if (!branchId) {
        await sendTelegramMessage(
          chatId,
          "لا يوجد فرع نشط لربطه. أنشئ الفرع أولاً من لوحة فالنتينو.",
        );
        return NextResponse.json({ ok: true });
      }

      const label =
        message.from?.first_name ||
        message.from?.username ||
        message.chat.title ||
        `chat-${chatId}`;

      await upsertTelegramSubscriber({
        branchId,
        chatId,
        label,
      });

      await sendTelegramMessage(
        chatId,
        [
          "✅ تم ربط هذا الحساب بتنبيهات فالنتينو.",
          "",
          "الأوامر:",
          "/today — تسليمات اليوم",
          "/upcoming — المناسبات القادمة",
          "/stop — إيقاف التنبيهات",
        ].join("\n"),
      );
      return NextResponse.json({ ok: true });
    }

    if (command === "/stop") {
      await deactivateTelegramSubscriber(chatId);
      await sendTelegramMessage(chatId, "تم إيقاف التنبيهات لهذا الحساب.");
      return NextResponse.json({ ok: true });
    }

    if (command === "/today" || command === "/upcoming") {
      const branchId = await resolveDefaultBranchId();
      if (!branchId) {
        await sendTelegramMessage(chatId, "لا يوجد فرع مرتبط.");
        return NextResponse.json({ ok: true });
      }

      const upcoming = await loadUpcomingForBranch(branchId);
      if (command === "/today") {
        const today = new Date().toISOString().slice(0, 10);
        const todays = upcoming.filter((item) => item.deliveryDate === today);
        await sendTelegramMessage(
          chatId,
          formatUpcomingDigest(
            todays.map((item) => ({
              orderNumber: item.orderNumber,
              customerName: item.customerName,
              deliveryDate: item.deliveryDate,
              deliveryTime: item.deliveryTime,
              countdownLabel: item.countdownLabel,
              urgencyLabel: item.urgencyLabel,
            })),
          ),
        );
      } else {
        await sendTelegramMessage(
          chatId,
          formatUpcomingDigest(
            upcoming.map((item) => ({
              orderNumber: item.orderNumber,
              customerName: item.customerName,
              deliveryDate: item.deliveryDate,
              deliveryTime: item.deliveryTime,
              countdownLabel: item.countdownLabel,
              urgencyLabel: item.urgencyLabel,
            })),
          ),
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (command === "/help") {
      await sendTelegramMessage(
        chatId,
        [
          "بوت فالنتينو — تنبيهات الطلبات والمناسبات",
          "",
          "/start — ربط الحساب",
          "/today — تسليمات اليوم",
          "/upcoming — المناسبات القادمة",
          "/stop — إيقاف التنبيهات",
        ].join("\n"),
      );
      return NextResponse.json({ ok: true });
    }

  } catch (error) {
    console.error("[telegram-webhook]", error);
  }

  return NextResponse.json({ ok: true });
}
