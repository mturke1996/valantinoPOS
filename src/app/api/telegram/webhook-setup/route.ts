import { NextResponse } from "next/server";

import { PRODUCTION_APP_URL, resolveAppBaseUrl } from "@/lib/constants/app";
import { createClient } from "@/lib/supabase/server";
import {
  buildTelegramWebhookUrl,
  generateWebhookSecret,
  getTelegramConfigForBranch,
  maskTelegramToken,
  resolveTelegramBotToken,
  saveTelegramConfigForBranch,
} from "@/lib/telegram/config";
import { telegramApi } from "@/lib/telegram/bot";

type WebhookInfo = {
  url?: string;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
};

async function requireManager() {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: NextResponse.json({ error: "Supabase غير مُعد" }, { status: 503 }),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("branch_id, role_key")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.branch_id || profile.role_key !== "manager") {
    return {
      error: NextResponse.json(
        { error: "صلاحية المدير مطلوبة" },
        { status: 403 },
      ),
    };
  }

  return { branchId: String(profile.branch_id) };
}

function resolvePreferredAppUrl(
  request: Request,
  storedAppUrl?: string | null,
): string {
  if (storedAppUrl?.trim()) return resolveAppBaseUrl(storedAppUrl);
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return resolveAppBaseUrl(envUrl);
  const origin = request.headers.get("origin");
  if (origin && !origin.includes("localhost")) {
    return resolveAppBaseUrl(origin);
  }
  return resolveAppBaseUrl(PRODUCTION_APP_URL);
}

export async function GET(request: Request) {
  const auth = await requireManager();
  if ("error" in auth && auth.error) return auth.error;
  const branchId = auth.branchId!;

  const config = await getTelegramConfigForBranch(branchId);
  const token = await resolveTelegramBotToken(branchId);
  const appUrl = resolvePreferredAppUrl(request, config.appUrl);
  const webhookUrl = buildTelegramWebhookUrl(appUrl);

  let webhookInfo: WebhookInfo | null = null;
  let webhookError: string | null = null;
  if (token) {
    try {
      webhookInfo = await telegramApi<WebhookInfo>("getWebhookInfo", undefined, {
        token,
      });
    } catch (error) {
      webhookError =
        error instanceof Error ? error.message : "تعذّر قراءة حالة الويب هوك";
    }
  }

  const activeUrl = webhookInfo?.url?.trim() || "";
  const isActive = Boolean(
    activeUrl && activeUrl.replace(/\/+$/, "") === webhookUrl,
  );

  return NextResponse.json({
    appUrl,
    webhookUrl,
    hasToken: Boolean(token),
    tokenSource: config.botToken ? "database" : token ? "env" : "none",
    hasSecret: Boolean(config.webhookSecret),
    secretMasked: maskTelegramToken(config.webhookSecret),
    isActive,
    pendingUpdateCount: webhookInfo?.pending_update_count ?? 0,
    lastErrorMessage: webhookInfo?.last_error_message ?? null,
    lastErrorDate: webhookInfo?.last_error_date
      ? new Date(webhookInfo.last_error_date * 1000).toISOString()
      : null,
    currentTelegramUrl: activeUrl || null,
    webhookError,
  });
}

export async function POST(request: Request) {
  const auth = await requireManager();
  if ("error" in auth && auth.error) return auth.error;
  const branchId = auth.branchId!;

  let body: { action?: "set" | "delete" | "refresh-secret" } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = { action: "set" };
  }

  const action = body.action ?? "set";
  const token = await resolveTelegramBotToken(branchId);
  if (!token) {
    return NextResponse.json(
      { error: "احفظ توكن البوت أولاً من الإعدادات (يُخزَّن في قاعدة البيانات)" },
      { status: 400 },
    );
  }

  if (action === "delete") {
    await telegramApi("deleteWebhook", { drop_pending_updates: false }, { token });
    return NextResponse.json({
      ok: true,
      message: "تم إيقاف الويب هوك",
      isActive: false,
    });
  }

  let config = await getTelegramConfigForBranch(branchId);
  if (action === "refresh-secret" || !config.webhookSecret) {
    const secret = generateWebhookSecret();
    config = await saveTelegramConfigForBranch(branchId, {
      webhookSecret: secret,
      keepExistingToken: true,
    });
  }

  if (action === "refresh-secret") {
    return NextResponse.json({
      ok: true,
      message: "تم توليد سر جديد في قاعدة البيانات — فعّل الويب هوك لتطبيقه",
      secretMasked: maskTelegramToken(config.webhookSecret),
      hasSecret: Boolean(config.webhookSecret),
    });
  }

  const appUrl = resolvePreferredAppUrl(request, config.appUrl);
  const webhookUrl = buildTelegramWebhookUrl(appUrl);

  if (webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1")) {
    return NextResponse.json(
      {
        error: `تلجرام لا يقبل localhost. استخدم ${PRODUCTION_APP_URL}`,
      },
      { status: 400 },
    );
  }

  const secret = config.webhookSecret || generateWebhookSecret();

  await saveTelegramConfigForBranch(branchId, {
    webhookSecret: secret,
    appUrl,
    keepExistingToken: true,
  });

  await telegramApi(
    "setWebhook",
    {
      url: webhookUrl,
      secret_token: secret,
      drop_pending_updates: false,
      allowed_updates: ["message"],
    },
    { token },
  );

  const info = await telegramApi<WebhookInfo>("getWebhookInfo", undefined, {
    token,
  });

  return NextResponse.json({
    ok: true,
    message: "تم تفعيل الويب هوك وحفظ الإعدادات في قاعدة البيانات",
    appUrl,
    webhookUrl,
    isActive: Boolean(info.url),
    currentTelegramUrl: info.url ?? webhookUrl,
    pendingUpdateCount: info.pending_update_count ?? 0,
    lastErrorMessage: info.last_error_message ?? null,
    secretMasked: maskTelegramToken(secret),
    storedInDatabase: true,
  });
}
