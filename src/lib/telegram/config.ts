import { resolveAppBaseUrl } from "@/lib/constants/app";
import { createTelegramAdminClient } from "@/lib/telegram/admin";
import { parseTelegramChatIds } from "@/lib/telegram/chat-ids";

export { parseTelegramChatIds } from "@/lib/telegram/chat-ids";

export type TelegramBranchConfig = {
  botToken: string | null;
  botUsername: string | null;
  /** Primary chat id (first entry) — kept for backwards compatibility */
  chatId: string | null;
  /** All destination chat ids (users / groups) */
  chatIds: string[];
  webhookSecret: string | null;
  /** Public app URL used for webhook (stored in DB) */
  appUrl: string | null;
};

const EMPTY: TelegramBranchConfig = {
  botToken: null,
  botUsername: null,
  chatId: null,
  chatIds: [],
  webhookSecret: null,
  appUrl: null,
};

export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function maskTelegramToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (trimmed.length < 8) return "••••••••";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

function readChatIdsFromValue(value: Record<string, unknown>): string[] {
  const fromArray = parseTelegramChatIds(value.chatIds);
  const fromLegacy = parseTelegramChatIds(value.chatId);
  const merged = new Set([...fromArray, ...fromLegacy]);
  return [...merged];
}

export async function getTelegramConfigForBranch(
  branchId: string,
): Promise<TelegramBranchConfig> {
  const admin = createTelegramAdminClient();
  if (!admin) return { ...EMPTY };

  const { data } = await admin
    .from("settings")
    .select("value")
    .eq("branch_id", branchId)
    .eq("key", "telegram")
    .maybeSingle();

  const value = (data?.value ?? {}) as Record<string, unknown>;
  const chatIds = readChatIdsFromValue(value);
  return {
    botToken:
      typeof value.botToken === "string" && value.botToken.trim()
        ? value.botToken.trim()
        : null,
    botUsername:
      typeof value.botUsername === "string" && value.botUsername.trim()
        ? value.botUsername.trim().replace(/^@/, "")
        : null,
    chatId: chatIds[0] ?? null,
    chatIds,
    webhookSecret:
      typeof value.webhookSecret === "string" && value.webhookSecret.trim()
        ? value.webhookSecret.trim()
        : null,
    appUrl:
      typeof value.appUrl === "string" && value.appUrl.trim()
        ? value.appUrl.trim().replace(/\/+$/, "")
        : null,
  };
}

export async function saveTelegramConfigForBranch(
  branchId: string,
  input: {
    botToken?: string | null;
    botUsername?: string | null;
    chatId?: string | null;
    chatIds?: string[] | string | null;
    webhookSecret?: string | null;
    appUrl?: string | null;
    keepExistingToken?: boolean;
  },
): Promise<TelegramBranchConfig> {
  const admin = createTelegramAdminClient();
  if (!admin) {
    throw new Error("Supabase service role غير مُعد");
  }

  const current = await getTelegramConfigForBranch(branchId);

  let chatIds = current.chatIds;
  if (input.chatIds !== undefined) {
    chatIds = parseTelegramChatIds(input.chatIds);
  } else if (input.chatId !== undefined) {
    chatIds = parseTelegramChatIds(input.chatId);
  }

  const next: TelegramBranchConfig = {
    botToken:
      input.keepExistingToken || input.botToken === undefined
        ? current.botToken
        : input.botToken?.trim() || null,
    botUsername:
      input.botUsername === undefined
        ? current.botUsername
        : input.botUsername?.trim().replace(/^@/, "") || null,
    chatId: chatIds[0] ?? null,
    chatIds,
    webhookSecret:
      input.webhookSecret === undefined
        ? current.webhookSecret
        : input.webhookSecret?.trim() || null,
    appUrl:
      input.appUrl === undefined
        ? current.appUrl
        : input.appUrl?.trim().replace(/\/+$/, "") || null,
  };

  const { error } = await admin.from("settings").upsert(
    {
      branch_id: branchId,
      key: "telegram",
      value: {
        botToken: next.botToken,
        botUsername: next.botUsername,
        chatId: next.chatId,
        chatIds: next.chatIds,
        webhookSecret: next.webhookSecret,
        appUrl: next.appUrl,
      },
    },
    { onConflict: "branch_id,key" },
  );
  if (error) throw error;
  return next;
}

export async function resolveTelegramBotToken(
  branchId?: string | null,
): Promise<string | null> {
  if (branchId) {
    const config = await getTelegramConfigForBranch(branchId);
    if (config.botToken) return config.botToken;
  }

  const admin = createTelegramAdminClient();
  if (admin) {
    const { data } = await admin
      .from("settings")
      .select("value")
      .eq("key", "telegram")
      .limit(20);
    for (const row of data ?? []) {
      const value = row.value as Record<string, unknown> | null;
      if (typeof value?.botToken === "string" && value.botToken.trim()) {
        return value.botToken.trim();
      }
    }
  }

  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export async function resolveTelegramChatIds(
  branchId: string,
): Promise<number[]> {
  const config = await getTelegramConfigForBranch(branchId);
  const ids = new Set<number>();

  for (const raw of config.chatIds) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) ids.add(parsed);
  }

  const admin = createTelegramAdminClient();
  if (admin) {
    const { data } = await admin
      .from("telegram_subscribers")
      .select("chat_id")
      .eq("branch_id", branchId)
      .eq("active", true);
    for (const row of data ?? []) {
      const id = Number(row.chat_id);
      if (Number.isFinite(id)) ids.add(id);
    }
  }

  return [...ids];
}

export async function resolveTelegramWebhookSecret(
  branchId?: string | null,
): Promise<string | null> {
  if (branchId) {
    const config = await getTelegramConfigForBranch(branchId);
    if (config.webhookSecret) return config.webhookSecret;
  }

  const admin = createTelegramAdminClient();
  if (admin) {
    const { data } = await admin
      .from("settings")
      .select("value")
      .eq("key", "telegram")
      .limit(20);
    for (const row of data ?? []) {
      const value = row.value as Record<string, unknown> | null;
      if (
        typeof value?.webhookSecret === "string" &&
        value.webhookSecret.trim()
      ) {
        return value.webhookSecret.trim();
      }
    }
  }

  return process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || null;
}

export function buildTelegramWebhookUrl(appUrl?: string | null): string {
  return `${resolveAppBaseUrl(appUrl)}/api/telegram/webhook`;
}
