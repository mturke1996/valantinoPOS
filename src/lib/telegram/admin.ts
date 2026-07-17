import { createClient as createAdminClient } from "@supabase/supabase-js";

export function createTelegramAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function listActiveTelegramChatIds(
  branchId?: string,
): Promise<Array<{ chatId: number; branchId: string }>> {
  const admin = createTelegramAdminClient();
  if (!admin) return [];

  let query = admin
    .from("telegram_subscribers")
    .select("chat_id, branch_id")
    .eq("active", true);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    chatId: Number(row.chat_id),
    branchId: String(row.branch_id),
  }));
}

export async function upsertTelegramSubscriber(input: {
  branchId: string;
  chatId: number;
  label?: string | null;
}): Promise<void> {
  const admin = createTelegramAdminClient();
  if (!admin) {
    throw new Error("Supabase service role غير مُعد");
  }

  const { error } = await admin.from("telegram_subscribers").upsert(
    {
      branch_id: input.branchId,
      chat_id: input.chatId,
      label: input.label ?? null,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "branch_id,chat_id" },
  );

  if (error) throw error;
}

export async function deactivateTelegramSubscriber(
  chatId: number,
): Promise<void> {
  const admin = createTelegramAdminClient();
  if (!admin) return;
  await admin
    .from("telegram_subscribers")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("chat_id", chatId);
}

export async function hasReminderBeenSent(
  branchId: string,
  dedupKey: string,
): Promise<boolean> {
  const admin = createTelegramAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("telegram_reminder_log")
    .select("id")
    .eq("branch_id", branchId)
    .eq("dedup_key", dedupKey)
    .maybeSingle();
  return Boolean(data);
}

export async function markReminderSent(
  branchId: string,
  dedupKey: string,
): Promise<void> {
  const admin = createTelegramAdminClient();
  if (!admin) return;
  await admin.from("telegram_reminder_log").upsert(
    {
      branch_id: branchId,
      dedup_key: dedupKey,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "branch_id,dedup_key" },
  );
}

export async function resolveDefaultBranchId(): Promise<string | null> {
  const admin = createTelegramAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("branches")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}
