import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getTelegramConfigForBranch,
  parseTelegramChatIds,
  resolveTelegramBotToken,
  resolveTelegramChatIds,
} from "@/lib/telegram/config";
import {
  broadcastTelegramMessage,
  formatConnectionTestMessage,
  telegramApi,
} from "@/lib/telegram/bot";

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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("branch_id, role_key")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.branch_id || profile.role_key !== "manager") {
    return NextResponse.json({ error: "صلاحية المدير مطلوبة" }, { status: 403 });
  }

  const branchId = String(profile.branch_id);

  let body: {
    botToken?: string;
    chatId?: string;
    chatIds?: string[] | string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const config = await getTelegramConfigForBranch(branchId);
  const token =
    body.botToken?.trim() && !body.botToken.includes("…")
      ? body.botToken.trim()
      : await resolveTelegramBotToken(branchId);

  if (!token) {
    return NextResponse.json(
      { error: "أدخل توكن البوت أولاً ثم احفظ أو اختبر" },
      { status: 400 },
    );
  }

  let botUsername: string | null = config.botUsername;
  try {
    const me = await telegramApi<{
      username?: string;
      first_name?: string;
    }>("getMe", undefined, { token });
    botUsername = me.username ?? me.first_name ?? null;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? `فشل الاتصال بالبوت: ${error.message}`
            : "فشل الاتصال بالبوت",
      },
      { status: 400 },
    );
  }

  const fromBody = parseTelegramChatIds(body.chatIds ?? body.chatId);
  const chatIds =
    fromBody.length > 0
      ? fromBody.map(Number).filter(Number.isFinite)
      : await resolveTelegramChatIds(branchId);

  if (chatIds.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        botUsername,
        error: "أدخل Chat ID واحداً على الأقل لإرسال رسالة اختبار",
      },
      { status: 400 },
    );
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("name")
    .eq("id", branchId)
    .maybeSingle();

  try {
    const result = await broadcastTelegramMessage(
      chatIds,
      formatConnectionTestMessage(branch?.name),
      { token },
    );
    if (result.sent === 0) {
      return NextResponse.json(
        {
          ok: false,
          botUsername,
          error: "فشل الإرسال إلى كل معرفات المحادثة",
          failed: result.failed,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        botUsername,
        error:
          error instanceof Error
            ? `البوت يعمل لكن فشل الإرسال: ${error.message}`
            : "فشل إرسال رسالة الاختبار",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    botUsername,
    chatIds,
    chatId: String(chatIds[0]),
    message: `تم إرسال رسالة اختبار إلى ${chatIds.length} محادثة`,
  });
}
