import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getTelegramConfigForBranch,
  maskTelegramToken,
  resolveTelegramBotToken,
} from "@/lib/telegram/config";
import { getBotUsernameFromEnv } from "@/lib/telegram/bot";

export async function GET() {
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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("branch_id, role_key")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.branch_id) {
    return NextResponse.json({ error: "لا يوجد فرع" }, { status: 403 });
  }

  const branchId = String(profile.branch_id);
  const config = await getTelegramConfigForBranch(branchId);
  const token = await resolveTelegramBotToken(branchId);

  const { data: subscribers } = await supabase
    .from("telegram_subscribers")
    .select("id, chat_id, label, active, created_at")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  const username =
    config.botUsername || getBotUsernameFromEnv();
  const deepLink = username ? `https://t.me/${username}` : null;

  return NextResponse.json({
    configured: Boolean(token),
    hasToken: Boolean(config.botToken || token),
    tokenSource: config.botToken ? "database" : token ? "env" : "none",
    botTokenMasked: maskTelegramToken(config.botToken || token),
    botUsername: username,
    chatId: config.chatId,
    chatIds: config.chatIds,
    appUrl: config.appUrl,
    deepLink,
    subscribers: (subscribers ?? []).map((row) => ({
      id: row.id,
      chatId: row.chat_id,
      label: row.label,
      active: row.active,
      createdAt: row.created_at,
    })),
    canManage: profile.role_key === "manager",
  });
}
