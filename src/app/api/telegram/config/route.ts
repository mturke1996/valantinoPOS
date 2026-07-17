import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { upsertTelegramSubscriber } from "@/lib/telegram/admin";
import {
  getTelegramConfigForBranch,
  maskTelegramToken,
  parseTelegramChatIds,
  saveTelegramConfigForBranch,
} from "@/lib/telegram/config";
import { telegramApi } from "@/lib/telegram/bot";

async function requireManager() {
  const supabase = await createClient();
  if (!supabase) {
    return { error: NextResponse.json({ error: "Supabase غير مُعد" }, { status: 503 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("branch_id, role_key")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.branch_id || profile.role_key !== "manager") {
    return {
      error: NextResponse.json({ error: "صلاحية المدير مطلوبة" }, { status: 403 }),
    };
  }

  return { branchId: String(profile.branch_id) };
}

export async function GET() {
  const auth = await requireManager();
  if ("error" in auth && auth.error) return auth.error;

  const config = await getTelegramConfigForBranch(auth.branchId!);
  return NextResponse.json({
    botTokenMasked: maskTelegramToken(config.botToken),
    hasToken: Boolean(config.botToken),
    tokenSource: config.botToken ? "database" : "none",
    botUsername: config.botUsername,
    chatId: config.chatId,
    chatIds: config.chatIds,
    appUrl: config.appUrl,
    hasWebhookSecret: Boolean(config.webhookSecret),
    storedInDatabase: Boolean(
      config.botToken ||
        config.chatIds.length > 0 ||
        config.webhookSecret,
    ),
  });
}

export async function POST(request: Request) {
  const auth = await requireManager();
  if ("error" in auth && auth.error) return auth.error;
  const branchId = auth.branchId!;

  let body: {
    botToken?: string;
    botUsername?: string;
    chatId?: string;
    chatIds?: string[] | string;
    keepExistingToken?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const tokenInput = body.botToken?.trim() ?? "";
  const keepExistingToken =
    body.keepExistingToken === true ||
    tokenInput === "" ||
    tokenInput.includes("…");

  if (!keepExistingToken && tokenInput) {
    try {
      await telegramApi<{ username?: string }>("getMe", undefined, {
        token: tokenInput,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `توكن غير صالح: ${error.message}`
              : "توكن البوت غير صالح",
        },
        { status: 400 },
      );
    }
  }

  const chatIds =
    body.chatIds !== undefined
      ? parseTelegramChatIds(body.chatIds)
      : body.chatId !== undefined
        ? parseTelegramChatIds(body.chatId)
        : undefined;

  const saved = await saveTelegramConfigForBranch(branchId, {
    botToken: keepExistingToken ? undefined : tokenInput,
    keepExistingToken,
    botUsername: body.botUsername,
    chatIds,
  });

  for (const raw of saved.chatIds) {
    const chatId = Number(raw);
    if (!Number.isFinite(chatId)) continue;
    try {
      await upsertTelegramSubscriber({
        branchId,
        chatId,
        label: "إعدادات يدوية",
      });
    } catch {
      // Subscriber table optional if migration missing locally
    }
  }

  let resolvedUsername = saved.botUsername;
  if (!resolvedUsername && saved.botToken) {
    try {
      const me = await telegramApi<{ username?: string }>("getMe", undefined, {
        token: saved.botToken,
      });
      if (me.username) {
        resolvedUsername = me.username;
        await saveTelegramConfigForBranch(branchId, {
          botUsername: me.username,
          keepExistingToken: true,
        });
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    ok: true,
    botTokenMasked: maskTelegramToken(saved.botToken),
    hasToken: Boolean(saved.botToken),
    tokenSource: saved.botToken ? "database" : "none",
    botUsername: resolvedUsername,
    chatId: saved.chatId,
    chatIds: saved.chatIds,
    appUrl: saved.appUrl,
    hasWebhookSecret: Boolean(saved.webhookSecret),
    storedInDatabase: true,
  });
}
