import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createTelegramAdminClient } from "@/lib/telegram/admin";
import {
  resolveTelegramBotToken,
  resolveTelegramChatIds,
} from "@/lib/telegram/config";
import {
  broadcastTelegramMessage,
  formatOrderCreatedMessage,
  formatPaymentMessage,
} from "@/lib/telegram/bot";

type NotifyBody =
  | {
      kind: "order_created";
      orderNumber: string;
      orderId: string;
      customerName: string;
      total: number;
      currencySymbol: string;
      deliveryDate: string | null;
      deliveryTime: string | null;
      typeLabel: string;
      itemCount: number;
      branchId: string;
    }
  | {
      kind: "payment";
      orderNumber: string;
      orderId: string;
      amount: number;
      currencySymbol: string;
      paymentStatus: string;
      branchId: string;
    };

async function telegramEnabledForBranch(branchId: string): Promise<boolean> {
  const admin = createTelegramAdminClient();
  if (!admin) return true;
  const { data } = await admin
    .from("settings")
    .select("value")
    .eq("branch_id", branchId)
    .eq("key", "app")
    .maybeSingle();
  const value = data?.value as Record<string, unknown> | undefined;
  if (typeof value?.telegramNotificationsEnabled === "boolean") {
    return value.telegramNotificationsEnabled;
  }
  return true;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase غير مُعد" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: NotifyBody;
  try {
    body = (await request.json()) as NotifyBody;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!body?.kind || !body.branchId) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const token = await resolveTelegramBotToken(body.branchId);
  if (!token) {
    return NextResponse.json({ ok: false, skipped: "not_configured" });
  }

  const enabled = await telegramEnabledForBranch(body.branchId);
  if (!enabled) {
    return NextResponse.json({ ok: false, skipped: "disabled" });
  }

  const chatIds = await resolveTelegramChatIds(body.branchId);
  if (chatIds.length === 0) {
    return NextResponse.json({ ok: false, skipped: "no_subscribers" });
  }

  const text =
    body.kind === "order_created"
      ? formatOrderCreatedMessage(body)
      : formatPaymentMessage(body);

  const result = await broadcastTelegramMessage(chatIds, text, {
    token,
    branchId: body.branchId,
  });

  return NextResponse.json({ ok: true, ...result });
}
