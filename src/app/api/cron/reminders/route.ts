import { NextResponse } from "next/server";

import { buildTelegramDueReminders } from "@/lib/reminders/event-reminders";
import {
  createTelegramAdminClient,
  hasReminderBeenSent,
  listActiveTelegramChatIds,
  markReminderSent,
} from "@/lib/telegram/admin";
import {
  resolveTelegramBotToken,
  resolveTelegramChatIds,
} from "@/lib/telegram/config";
import {
  broadcastTelegramMessage,
  formatUpcomingDigest,
  sendTelegramMessage,
} from "@/lib/telegram/bot";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    const cronHeader = request.headers.get("x-vercel-cron");
    return cronHeader === "1";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function collectBranchIds(): Promise<string[]> {
  const ids = new Set<string>();
  const subscribers = await listActiveTelegramChatIds();
  for (const sub of subscribers) ids.add(sub.branchId);

  const admin = createTelegramAdminClient();
  if (admin) {
    const { data } = await admin
      .from("settings")
      .select("branch_id, value")
      .eq("key", "telegram");
    for (const row of data ?? []) {
      const value = row.value as Record<string, unknown> | null;
      if (value?.botToken || value?.chatId) {
        ids.add(String(row.branch_id));
      }
    }
  }
  return [...ids];
}

async function runReminders() {
  const admin = createTelegramAdminClient();
  if (!admin) {
    return { ok: false, skipped: "no_admin" as const };
  }

  const branchIds = await collectBranchIds();
  if (branchIds.length === 0) {
    return { ok: true, sent: 0, skipped: "no_subscribers" as const };
  }

  let sent = 0;
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 7);
  const horizonDate = horizon.toISOString().slice(0, 10);

  for (const branchId of branchIds) {
    const token = await resolveTelegramBotToken(branchId);
    if (!token) continue;

    const chatIds = await resolveTelegramChatIds(branchId);
    if (chatIds.length === 0) continue;

    const { data: appSettings } = await admin
      .from("settings")
      .select("value")
      .eq("branch_id", branchId)
      .eq("key", "app")
      .maybeSingle();
    const appValue = appSettings?.value as Record<string, unknown> | undefined;
    if (appValue?.telegramNotificationsEnabled === false) continue;

    const currencySymbol =
      typeof appValue?.currencySymbol === "string"
        ? appValue.currencySymbol
        : "د.ل";

    const { data: orders } = await admin
      .from("orders")
      .select(
        "id, order_number, delivery_date, delivery_time, delivery_address, status, total, paid_amount, customer_id",
      )
      .eq("branch_id", branchId)
      .not("delivery_date", "is", null)
      .gte("delivery_date", today)
      .lte("delivery_date", horizonDate)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .limit(200);

    if (!orders?.length) continue;

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

    const sources = orders.map((order) => {
      const orderId = String(order.id);
      const lines = itemsByOrder.get(orderId) ?? [];
      const orderItems =
        items?.filter((i) => String(i.order_id) === orderId) ?? [];
      return {
        id: orderId,
        orderNumber: String(order.order_number),
        deliveryDate: String(order.delivery_date),
        deliveryTime: order.delivery_time
          ? String(order.delivery_time).slice(0, 5)
          : null,
        deliveryAddress: order.delivery_address
          ? String(order.delivery_address)
          : null,
        status: String(order.status),
        total: Number(order.total ?? 0),
        paidAmount: Number(order.paid_amount ?? 0),
        customerName: order.customer_id
          ? (customerMap.get(String(order.customer_id)) ?? "عميل")
          : "عميل نقدي",
        itemSummary: lines.slice(0, 3).join("، "),
        itemCount: orderItems.reduce(
          (sum, i) => sum + Number(i.quantity ?? 0),
          0,
        ),
        currencySymbol,
      };
    });

    const existingKeys = new Set<string>();
    for (const source of sources) {
      for (const offset of ["3d", "2d", "1d", "today"] as const) {
        const key =
          offset === "today"
            ? `delivery-today:${source.id}`
            : `reminder:${source.id}:${offset}`;
        if (await hasReminderBeenSent(branchId, key)) {
          existingKeys.add(key);
        }
      }
    }

    const due = buildTelegramDueReminders(sources, existingKeys);
    for (const message of due) {
      const result = await broadcastTelegramMessage(chatIds, message.text, {
        token,
        branchId,
      });
      sent += result.sent;
      if (result.sent > 0) {
        await markReminderSent(branchId, message.dedupKey);
      }
    }

    const digestKey = `upcoming-digest:${today}`;
    if (!(await hasReminderBeenSent(branchId, digestKey))) {
      const hour = new Date().getHours();
      if (hour >= 8 && hour <= 10) {
        const digestItems = sources
          .slice()
          .sort((a, b) =>
            `${a.deliveryDate} ${a.deliveryTime ?? ""}`.localeCompare(
              `${b.deliveryDate} ${b.deliveryTime ?? ""}`,
            ),
          )
          .map((item) => ({
            orderNumber: item.orderNumber,
            customerName: item.customerName,
            deliveryDate: item.deliveryDate,
            deliveryTime: item.deliveryTime,
            countdownLabel:
              item.deliveryDate === today ? "اليوم" : item.deliveryDate,
            urgencyLabel: item.deliveryDate === today ? "اليوم" : "قادم",
          }));
        const text = formatUpcomingDigest(digestItems);
        for (const chatId of chatIds) {
          await sendTelegramMessage(chatId, text, { token, branchId });
          sent += 1;
        }
        await markReminderSent(branchId, digestKey);
      }
    }

  }

  return { ok: true, sent };
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runReminders();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
