import { resolveTelegramBotToken } from "@/lib/telegram/config";

export {
  escapeHtml,
  formatConnectionTestMessage,
  formatEventReminderMessage,
  formatOrderCreatedMessage,
  formatPaymentMessage,
  formatUpcomingDigest,
} from "@/lib/telegram/messages";

const TELEGRAM_API = "https://api.telegram.org";

export function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export function getTelegramWebhookSecret(): string | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function isTelegramConfigured(): boolean {
  return Boolean(getTelegramBotToken());
}

export async function isTelegramConfiguredAsync(
  branchId?: string | null,
): Promise<boolean> {
  return Boolean(await resolveTelegramBotToken(branchId));
}

export async function telegramApi<T = unknown>(
  method: string,
  body?: Record<string, unknown>,
  options?: { token?: string | null; branchId?: string | null },
): Promise<T> {
  const token =
    options?.token ??
    (await resolveTelegramBotToken(options?.branchId)) ??
    getTelegramBotToken();
  if (!token) {
    throw new Error("توكن بوت تلجرام غير مُعد");
  }

  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = (await response.json()) as {
    ok: boolean;
    description?: string;
    result?: T;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API failed: ${method}`);
  }

  return data.result as T;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    disableNotification?: boolean;
    token?: string | null;
    branchId?: string | null;
  },
): Promise<void> {
  await telegramApi(
    "sendMessage",
    {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      disable_notification: options?.disableNotification ?? false,
    },
    { token: options?.token, branchId: options?.branchId },
  );
}

export async function broadcastTelegramMessage(
  chatIds: Array<number | string>,
  text: string,
  options?: { token?: string | null; branchId?: string | null },
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const chatId of chatIds) {
    try {
      await sendTelegramMessage(chatId, text, options);
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { sent, failed };
}

export function getBotUsernameFromEnv(): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (!username) return null;
  return username.replace(/^@/, "");
}
