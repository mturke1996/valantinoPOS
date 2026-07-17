export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function divider(): string {
  return "────────────────";
}

function brandFooter(): string {
  return "🍫 <i>فالنتينو للشوكولاتة</i>";
}

/** Sample payloads for settings preview UI */
export const TELEGRAM_PREVIEW_SAMPLES = {
  order: {
    typeLabel: "مناسبة",
    orderNumber: "VAL-1042",
    customerName: "سارة أحمد",
    total: 485,
    currencySymbol: "د.ل",
    deliveryDate: "2026-07-24",
    deliveryTime: "17:30",
    itemCount: 3,
    branchPhone: "0925620266",
  },
  payment: {
    orderNumber: "VAL-1042",
    amount: 200,
    currencySymbol: "د.ل",
    paymentStatus: "partial" as const,
  },
  reminder: {
    orderNumber: "VAL-1042",
    customerName: "سارة أحمد",
    deliveryDate: "2026-07-24",
    deliveryTime: "17:30",
    deliveryAddress: "طرابلس — حي الأندلس",
    itemSummary: "علبة فاخرة ×2 · بونبون ×1",
    itemCount: 3,
    balance: 85,
    currencySymbol: "د.ل",
    branchPhone: "0925620266",
  },
  digest: [
    {
      orderNumber: "VAL-1042",
      customerName: "سارة أحمد",
      deliveryDate: "2026-07-24",
      deliveryTime: "17:30",
      countdownLabel: "خلال يومين",
      urgencyLabel: "قريب",
    },
    {
      orderNumber: "VAL-1048",
      customerName: "محمد علي",
      deliveryDate: "2026-07-25",
      deliveryTime: "12:00",
      countdownLabel: "خلال 3 أيام",
      urgencyLabel: "خلال الأسبوع",
    },
  ],
} as const;

export type ReminderOffsetPreview = "3d" | "2d" | "1d" | "today";

export function formatOrderCreatedMessage(input: {
  typeLabel: string;
  orderNumber: string;
  customerName: string;
  total: number;
  currencySymbol: string;
  deliveryDate: string | null;
  deliveryTime: string | null;
  itemCount: number;
  branchPhone?: string | null;
}): string {
  const lines = [
    `🆕 <b>طلب ${escapeHtml(input.typeLabel)} جديد</b>`,
    divider(),
    `🔢 <b>رقم الطلب:</b> ${escapeHtml(input.orderNumber)}`,
    `👤 <b>العميل:</b> ${escapeHtml(input.customerName)}`,
    `📦 <b>الأصناف:</b> ${input.itemCount}`,
    `💰 <b>المبلغ:</b> ${input.total.toFixed(2)} ${escapeHtml(input.currencySymbol)}`,
  ];
  if (input.deliveryDate) {
    lines.push(
      `📅 <b>الموعد:</b> ${escapeHtml(input.deliveryDate)}${input.deliveryTime ? ` · ${escapeHtml(input.deliveryTime)}` : ""}`,
    );
  }
  if (input.branchPhone) {
    lines.push(`📞 ${escapeHtml(input.branchPhone)}`);
  }
  lines.push(divider(), brandFooter());
  return lines.join("\n");
}

export function formatPaymentMessage(input: {
  orderNumber: string;
  amount: number;
  currencySymbol: string;
  paymentStatus: string;
}): string {
  const statusLabel =
    input.paymentStatus === "paid"
      ? "مدفوع بالكامل ✅"
      : input.paymentStatus === "partial"
        ? "دفعة جزئية"
        : input.paymentStatus;
  return [
    "💳 <b>تحصيل دفعة</b>",
    divider(),
    `🔢 <b>الطلب:</b> ${escapeHtml(input.orderNumber)}`,
    `💰 <b>المبلغ:</b> ${input.amount.toFixed(2)} ${escapeHtml(input.currencySymbol)}`,
    `📌 <b>الحالة:</b> ${escapeHtml(statusLabel)}`,
    divider(),
    brandFooter(),
  ].join("\n");
}

export function formatEventReminderMessage(input: {
  offsetKey: ReminderOffsetPreview;
  orderNumber: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: string | null;
  deliveryAddress: string | null;
  itemSummary: string;
  itemCount: number;
  balance: number;
  currencySymbol: string;
  branchPhone?: string | null;
}): string {
  const meta: Record<
    ReminderOffsetPreview,
    { headline: string; action: string; tone: string }
  > = {
    "3d": {
      headline: "📅 تذكير مناسبة — قبل 3 أيام",
      action: "ابدأ تجهيز الطلب الآن",
      tone: "وقت مبكر للتجهيز",
    },
    "2d": {
      headline: "🎀 تذكير مناسبة — قبل يومين",
      action: "أكمل التجهيز والتغليف",
      tone: "اقترب الموعد",
    },
    "1d": {
      headline: "⏰ تذكير مناسبة — غداً",
      action: "جهّز الطلب للتسليم غداً",
      tone: "آخر يوم للتجهيز",
    },
    today: {
      headline: "🚚 تسليم اليوم",
      action: "استعد للتسليم اليوم",
      tone: "موعد التسليم اليوم",
    },
  };

  const { headline, action, tone } = meta[input.offsetKey];

  const lines = [
    `<b>${headline}</b>`,
    `<i>${tone}</i>`,
    divider(),
    `🔢 <b>الطلب:</b> ${escapeHtml(input.orderNumber)}`,
    `👤 <b>العميل:</b> ${escapeHtml(input.customerName)}`,
    `📅 <b>الموعد:</b> ${escapeHtml(input.deliveryDate)}${input.deliveryTime ? ` · ${escapeHtml(input.deliveryTime)}` : ""}`,
    input.deliveryAddress
      ? `📍 <b>العنوان:</b> ${escapeHtml(input.deliveryAddress)}`
      : "📍 <b>الاستلام:</b> من المتجر",
    `📦 <b>المحتوى:</b> ${input.itemCount} قطعة`,
    `   ${escapeHtml(input.itemSummary)}`,
    input.balance > 0
      ? `💰 <b>المتبقي:</b> ${input.balance.toFixed(2)} ${escapeHtml(input.currencySymbol)}`
      : "✅ <b>الدفع:</b> مكتمل",
  ];

  if (input.branchPhone) {
    lines.push(`📞 ${escapeHtml(input.branchPhone)}`);
  }

  lines.push(divider(), `✨ ${action}`, brandFooter());
  return lines.join("\n");
}

export function formatUpcomingDigest(
  items: Array<{
    orderNumber: string;
    customerName: string;
    deliveryDate: string;
    deliveryTime: string | null;
    countdownLabel: string;
    urgencyLabel: string;
  }>,
): string {
  if (items.length === 0) {
    return [
      "✅ <b>لا توجد مناسبات قادمة</b>",
      divider(),
      "الجدول هادئ حالياً — لا مواعيد خلال الفترة القادمة.",
      brandFooter(),
    ].join("\n");
  }

  const lines = [
    `📋 <b>المناسبات القادمة</b>`,
    `<i>${items.length} موعد يحتاج متابعة</i>`,
    divider(),
    "",
  ];

  for (const [index, item] of items.slice(0, 15).entries()) {
    lines.push(
      `<b>${index + 1}) ${escapeHtml(item.orderNumber)}</b> — ${escapeHtml(item.customerName)}`,
      `   🏷 ${escapeHtml(item.urgencyLabel)} · ${escapeHtml(item.countdownLabel)}`,
      `   📅 ${escapeHtml(item.deliveryDate)}${item.deliveryTime ? ` · ${escapeHtml(item.deliveryTime)}` : ""}`,
      "",
    );
  }

  if (items.length > 15) {
    lines.push(`… و${items.length - 15} مواعيد أخرى`);
  }

  lines.push(divider(), brandFooter());
  return lines.join("\n").trim();
}

export function formatConnectionTestMessage(branchName?: string | null): string {
  return [
    "✅ <b>اختبار اتصال ناجح</b>",
    divider(),
    "بوت فالنتينو متصل وجاهز لإرسال تنبيهات الطلبات والمناسبات.",
    branchName ? `🏪 ${escapeHtml(branchName)}` : null,
    "",
    "⏱ التذكيرات:",
    "• قبل 3 أيام — ابدأ التجهيز",
    "• قبل يومين — أكمل التغليف",
    "• قبل يوم واحد — جهّز للتسليم",
    divider(),
    brandFooter(),
  ]
    .filter(Boolean)
    .join("\n");
}

export type TelegramPreviewKind =
  | "reminder_3d"
  | "reminder_2d"
  | "reminder_1d"
  | "reminder_today"
  | "order"
  | "payment"
  | "digest";

export function buildTelegramPreviewMessage(kind: TelegramPreviewKind): string {
  const sample = TELEGRAM_PREVIEW_SAMPLES;
  switch (kind) {
    case "reminder_3d":
      return formatEventReminderMessage({ ...sample.reminder, offsetKey: "3d" });
    case "reminder_2d":
      return formatEventReminderMessage({ ...sample.reminder, offsetKey: "2d" });
    case "reminder_1d":
      return formatEventReminderMessage({ ...sample.reminder, offsetKey: "1d" });
    case "reminder_today":
      return formatEventReminderMessage({
        ...sample.reminder,
        offsetKey: "today",
      });
    case "order":
      return formatOrderCreatedMessage(sample.order);
    case "payment":
      return formatPaymentMessage(sample.payment);
    case "digest":
      return formatUpcomingDigest([...sample.digest]);
    default:
      return "";
  }
}
