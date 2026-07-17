"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MessageCircle,
  Plus,
  Power,
  RefreshCw,
  Save,
  Send,
  Unplug,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { TelegramMessagePreview } from "@/components/settings/telegram-message-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { parseTelegramChatIds } from "@/lib/telegram/chat-ids";

type TelegramStatus = {
  configured: boolean;
  botUsername: string | null;
  deepLink: string | null;
  botTokenMasked?: string | null;
  hasToken?: boolean;
  chatId?: string | null;
  chatIds?: string[];
  subscribers: Array<{
    id: string;
    chatId: number;
    label: string | null;
    active: boolean;
    createdAt: string;
  }>;
  canManage: boolean;
};

type WebhookStatus = {
  webhookUrl: string | null;
  hasToken: boolean;
  hasSecret: boolean;
  secretMasked: string | null;
  isActive: boolean;
  pendingUpdateCount: number;
  lastErrorMessage: string | null;
  lastErrorDate: string | null;
  currentTelegramUrl: string | null;
  webhookError: string | null;
};

export function TelegramSettingsCard({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
}) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [webhook, setWebhook] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [webhookBusy, setWebhookBusy] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [chatIds, setChatIds] = useState<string[]>([]);
  const [chatIdDraft, setChatIdDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, configRes, webhookRes] = await Promise.all([
        fetch("/api/telegram/status"),
        fetch("/api/telegram/config"),
        fetch("/api/telegram/webhook-setup"),
      ]);
      if (!statusRes.ok) throw new Error("failed");
      const statusJson = (await statusRes.json()) as TelegramStatus;
      setStatus(statusJson);

      if (configRes.ok) {
        const configJson = (await configRes.json()) as {
          botTokenMasked?: string | null;
          hasToken?: boolean;
          botUsername?: string | null;
          chatId?: string | null;
          chatIds?: string[];
        };
        setBotToken(configJson.botTokenMasked ?? "");
        setBotUsername(configJson.botUsername ?? "");
        const ids =
          configJson.chatIds && configJson.chatIds.length > 0
            ? configJson.chatIds
            : parseTelegramChatIds(configJson.chatId);
        setChatIds(ids);
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                configured: Boolean(configJson.hasToken || prev.configured),
                botUsername: configJson.botUsername ?? prev.botUsername,
                deepLink: configJson.botUsername
                  ? `https://t.me/${configJson.botUsername}`
                  : prev.deepLink,
                botTokenMasked: configJson.botTokenMasked,
                hasToken: configJson.hasToken,
                chatId: ids[0] ?? null,
                chatIds: ids,
              }
            : prev,
        );
      }

      if (webhookRes.ok) {
        setWebhook((await webhookRes.json()) as WebhookStatus);
      }
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addChatId = () => {
    const parsed = parseTelegramChatIds(chatIdDraft);
    if (parsed.length === 0) {
      toast.error("أدخل Chat ID صالحاً (أرقام فقط، والمجموعات تبدأ بـ -)");
      return;
    }
    setChatIds((prev) => {
      const next = new Set([...prev, ...parsed]);
      return [...next];
    });
    setChatIdDraft("");
  };

  const removeChatId = (id: string) => {
    setChatIds((prev) => prev.filter((x) => x !== id));
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const keepExistingToken =
        !botToken.trim() || botToken.includes("…") || botToken.includes("•");
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: keepExistingToken ? undefined : botToken.trim(),
          keepExistingToken,
          botUsername: botUsername.trim() || undefined,
          chatIds,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        botTokenMasked?: string;
        botUsername?: string | null;
        chatId?: string | null;
        chatIds?: string[];
      };
      if (!res.ok) {
        toast.error(data.error ?? "تعذّر حفظ إعدادات تلجرام");
        return;
      }
      setBotToken(data.botTokenMasked ?? botToken);
      if (data.botUsername) setBotUsername(data.botUsername);
      if (data.chatIds) setChatIds(data.chatIds);
      toast.success("تم حفظ إعدادات بوت تلجرام");
      await load();
    } catch {
      toast.error("تعذّر حفظ إعدادات تلجرام");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const keepExistingToken =
        !botToken.trim() || botToken.includes("…") || botToken.includes("•");
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: keepExistingToken ? undefined : botToken.trim(),
          chatIds,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        botUsername?: string | null;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "فشل اختبار الاتصال");
        return;
      }
      if (data.botUsername) setBotUsername(data.botUsername);
      toast.success(data.message ?? "الاتصال ناجح — راجع تلجرام");
    } catch {
      toast.error("فشل اختبار الاتصال");
    } finally {
      setTesting(false);
    }
  };

  const runWebhookAction = async (action: "set" | "delete") => {
    setWebhookBusy(true);
    try {
      const res = await fetch("/api/telegram/webhook-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "تعذّر تحديث الويب هوك");
        return;
      }
      toast.success(data.message ?? "تم تحديث الويب هوك");
      await load();
    } catch {
      toast.error("تعذّر تحديث الويب هوك");
    } finally {
      setWebhookBusy(false);
    }
  };

  const copyText = async (value: string | null | undefined, label: string) => {
    if (!value) {
      toast.error(`لا يوجد ${label} للنسخ`);
      return;
    }
    await navigator.clipboard.writeText(value);
    toast.success(`تم نسخ ${label}`);
  };

  const copyLink = async () => {
    const link = status?.deepLink
      ? status.deepLink
      : botUsername
        ? `https://t.me/${botUsername.replace(/^@/, "")}`
        : null;
    await copyText(link, "رابط البوت");
  };

  const activeCount =
    status?.subscribers.filter((s) => s.active).length ?? 0;
  const busy = saving || testing || webhookBusy;

  return (
    <Card className="border-cacao-800/8 shadow-none lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4 text-gold-400" />
          تنبيهات تلجرام
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-cacao-800/8 p-4">
          <div>
            <Label htmlFor="telegramNotificationsEnabled" className="text-sm">
              إرسال تنبيهات الطلبات والمواعيد
            </Label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              تذكير المناسبات قبل 3 أيام ويومين ويوم واحد، مع تنبيهات الطلبات
              والدفعات — تُرسل لكل Chat ID المضافة
            </p>
          </div>
          <Switch
            id="telegramNotificationsEnabled"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="telegramBotToken">توكن البوت (Bot Token)</Label>
            <Input
              id="telegramBotToken"
              dir="ltr"
              className="text-start font-mono text-sm"
              placeholder="123456:AA..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              من @BotFather → /newbot ثم الصق التوكن هنا
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="telegramBotUsername">اسم المستخدم للبوت</Label>
            <Input
              id="telegramBotUsername"
              dir="ltr"
              className="text-start"
              placeholder="ValentinoAlertsBot"
              value={botUsername}
              onChange={(e) => setBotUsername(e.target.value)}
            />
          </div>

          <div className="space-y-3 sm:col-span-2">
            <Label htmlFor="telegramChatIdDraft">معرفات المحادثة (Chat IDs)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="telegramChatIdDraft"
                dir="ltr"
                className="text-start font-mono"
                placeholder="123456789 أو -100123… للمجموعات"
                value={chatIdDraft}
                onChange={(e) =>
                  setChatIdDraft(e.target.value.replace(/[^\d\s,;-]/g, ""))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChatId();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="gap-2 shrink-0"
                onClick={addChatId}
              >
                <Plus className="size-4" />
                إضافة
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              يمكنك إضافة أكثر من حساب أو مجموعة. افصل بينها بفاصلة أو أضِف واحداً
              تلو الآخر. للحصول على Chat ID: أرسل للبوت ثم استخدم @userinfobot
              أو /start.
            </p>

            {chatIds.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {chatIds.map((id) => (
                  <li key={id}>
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-gold-400/25 bg-gold-400/5 py-1.5 pe-1 ps-2.5 font-mono text-xs"
                    >
                      {id}
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-cacao-800/10 hover:text-foreground"
                        onClick={() => removeChatId(id)}
                        aria-label={`حذف ${id}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-cacao-800/15 px-3 py-2 text-xs text-muted-foreground">
                لم يُضف أي Chat ID بعد — أضف واحداً على الأقل لاستلام التنبيهات
              </p>
            )}
          </div>
        </div>

        <TelegramMessagePreview />

        <div className="space-y-3 rounded-xl border border-cacao-800/8 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-gold-400" />
              <p className="text-sm font-medium">Webhook تلجرام</p>
            </div>
            <Badge
              variant="outline"
              className={
                webhook?.isActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border-caramel-500/30 bg-caramel-500/10"
              }
            >
              {loading
                ? "جاري التحقق…"
                : webhook?.isActive
                  ? "مفعّل"
                  : "غير مفعّل"}
            </Badge>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            اضغط «تفعيل الويب هوك» مرة واحدة بعد حفظ التوكن. الرابط الافتراضي:
            https://valantino-pos.vercel.app — والتوكن والسر يُحفظان في قاعدة
            البيانات.
          </p>

          <div className="space-y-2">
            <Label htmlFor="telegramWebhookUrl">رابط الويب هوك</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="telegramWebhookUrl"
                dir="ltr"
                readOnly
                className="text-start font-mono text-xs"
                value={webhook?.webhookUrl ?? "سيظهر بعد فتح الموقع على رابط عام"}
              />
              <Button
                type="button"
                variant="outline"
                className="gap-2 shrink-0"
                onClick={() =>
                  void copyText(webhook?.webhookUrl, "رابط الويب هوك")
                }
                disabled={!webhook?.webhookUrl}
              >
                <Copy className="size-4" />
                نسخ
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {webhook?.hasSecret ? (
              <span>سر الحماية: {webhook.secretMasked}</span>
            ) : (
              <span>سيتم توليد سر الحماية تلقائياً عند التفعيل</span>
            )}
            {typeof webhook?.pendingUpdateCount === "number" ? (
              <span>· تحديثات معلّقة: {webhook.pendingUpdateCount}</span>
            ) : null}
          </div>

          {webhook?.lastErrorMessage ? (
            <p className="rounded-lg border border-berry-500/20 bg-berry-500/5 px-3 py-2 text-xs text-berry-700 dark:text-berry-300">
              آخر خطأ من تلجرام: {webhook.lastErrorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="gap-2"
              onClick={() => void runWebhookAction("set")}
              disabled={busy || !(status?.hasToken || status?.configured)}
            >
              {webhookBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Power className="size-4" />
              )}
              {webhook?.isActive ? "إعادة تفعيل الويب هوك" : "تفعيل الويب هوك"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void runWebhookAction("delete")}
              disabled={busy || !webhook?.isActive}
            >
              <Unplug className="size-4" />
              إيقاف الويب هوك
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              status?.configured || status?.hasToken
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-caramel-500/30 bg-caramel-500/10"
            }
          >
            {loading
              ? "جاري التحقق…"
              : status?.configured || status?.hasToken
                ? "البوت جاهز"
                : "أدخل التوكن واحفظ"}
          </Badge>
          <Badge variant="outline">{chatIds.length} Chat ID</Badge>
          <Badge variant="outline">{activeCount} مشترك عبر /start</Badge>
          <Badge variant="outline">قبل 3 أيام · يومين · يوم</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => void saveConfig()}
            disabled={busy}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            حفظ إعدادات البوت
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void testConnection()}
            disabled={busy || chatIds.length === 0}
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            اختبار لكل المحادثات
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => void load()}
          >
            <RefreshCw className="size-3.5" />
            تحديث
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void copyLink()}
            disabled={!botUsername && !status?.deepLink}
          >
            <Copy className="size-4" />
            نسخ رابط البوت
          </Button>
          {(status?.deepLink || botUsername) && (
            <Button type="button" variant="outline" className="gap-2" asChild>
              <a
                href={
                  status?.deepLink ??
                  `https://t.me/${botUsername.replace(/^@/, "")}`
                }
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" />
                فتح تلجرام
              </a>
            </Button>
          )}
        </div>

        {status?.subscribers.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              الحسابات المرتبطة عبر /start
            </p>
            <ul className="space-y-1.5">
              {status.subscribers.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border border-cacao-800/8 px-3 py-2 text-sm"
                >
                  <span>
                    {sub.label || `Chat ${sub.chatId}`}
                    <span className="ms-2 font-mono text-xs text-muted-foreground">
                      {sub.chatId}
                    </span>
                  </span>
                  <Badge variant="outline">
                    {sub.active ? "نشط" : "متوقف"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
