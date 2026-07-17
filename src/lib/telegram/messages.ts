export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function divider(): string {
  return "────────────";
}

export function formatOrderCreatedMessage(input: {
  typeLabel: string;
  orderNumber: string;
  customerName: string;
  total: number;
  currencySymbol: string;
  deliveryDate: string | null;
  deliveryTime: string | null;
  itemCount: number;
}): string {
  const lines = [
    `🍫 <b>طلب ${escapeHtml(input.typeLabel)} جديد</b>`,
    divider(),
    `🔢 رقم الطلب: <b>${escapeHtml(input.orderNumber)}</b>`,
    `👤 العميل: ${escapeHtml(input.customerName)}`,
    `📦 الأصناف: ${input.itemCount}`,
    `💰 المبلغ: <b>${input.total.toFixed(2)} ${escapeHtml(input.currencySymbol)}</b>`,
  ];
  if (input.deliveryDate) {
    lines.push(
      `📅 الموعد: <b>${escapeHtml(input.deliveryDate)}${input.deliveryTime ? ` · ${escapeHtml(input.deliveryTime)}` : ""}</b>`,
    );
  }
  lines.push(divider(), "فالنتينو للشوكولاتة");
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
      ? "مدفوع بالكامل"
      : input.paymentStatus === "partial"
        ? "دفعة جزئية"
        : input.paymentStatus;
  return [
    "💳 <b>تحصيل دفعة</b>",
    divider(),
    `🔢 الطلب: <b>${escapeHtml(input.orderNumber)}</b>`,
    `💰 المبلغ: <b>${input.amount.toFixed(2)} ${escapeHtml(input.currencySymbol)}</b>`,
    `📌 الحالة: ${escapeHtml(statusLabel)}`,
    divider(),
    "فالنتينو للشوكولاتة",
  ].join("\n");
}

export function formatEventReminderMessage(input: {
  offsetKey: "3d" | "2d" | "1d" | "today";
  orderNumber: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: string | null;
  deliveryAddress: string | null;
  itemSummary: string;
  itemCount: number;
  balance: number;
  currencySymbol: string;
}): string {
  const headline =
    input.offsetKey === "3d"
      ? "📅 تذكير مناسبة — قبل 3 أيام"
      : input.offsetKey === "2d"
        ? "📅 تذكير مناسبة — قبل يومين"
        : input.offsetKey === "1d"
          ? "⏰ تذكير مناسبة — غداً"
          : "🚚 تسليم اليوم";

  const action =
    input.offsetKey === "3d"
      ? "ابدأ تجهيز الطلب"
      : input.offsetKey === "2d"
        ? "أكمل التجهيز والتغليف"
        : input.offsetKey === "1d"
          ? "جهّز الطلب للتسليم غداً"
          : "استعد للتسليم اليوم";

  return [
    `<b>${headline}</b>`,
    divider(),
    `🔢 الطلب: <b>${escapeHtml(input.orderNumber)}</b>`,
    `👤 العميل: ${escapeHtml(input.customerName)}`,
    `📅 الموعد: <b>${escapeHtml(input.deliveryDate)}${input.deliveryTime ? ` · ${escapeHtml(input.deliveryTime)}` : ""}</b>`,
    input.deliveryAddress
      ? `📍 العنوان: ${escapeHtml(input.deliveryAddress)}`
      : "📍 الاستلام من المتجر",
    `📦 ${input.itemCount} قطعة · ${escapeHtml(input.itemSummary)}`,
    input.balance > 0
      ? `💰 متبقي: <b>${input.balance.toFixed(2)} ${escapeHtml(input.currencySymbol)}</b>`
      : "✅ مدفوع بالكامل",
    divider(),
    `✨ ${action}`,
    "فالنتينو للشوكولاتة",
  ].join("\n");
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
      "الجدول هادئ حالياً.",
      "فالنتينو للشوكولاتة",
    ].join("\n");
  }
  const lines = [
    `📋 <b>المناسبات القادمة — ${items.length}</b>`,
    divider(),
    "",
  ];
  for (const item of items.slice(0, 15)) {
    lines.push(
      `• <b>${escapeHtml(item.orderNumber)}</b> · ${escapeHtml(item.customerName)}`,
      `  ${escapeHtml(item.urgencyLabel)} · ${escapeHtml(item.countdownLabel)}`,
      `  📅 ${escapeHtml(item.deliveryDate)}${item.deliveryTime ? ` · ${escapeHtml(item.deliveryTime)}` : ""}`,
      "",
    );
  }
  if (items.length > 15) {
    lines.push(`… و${items.length - 15} مواعيد أخرى`);
  }
  lines.push(divider(), "فالنتينو للشوكولاتة");
  return lines.join("\n").trim();
}

export function formatConnectionTestMessage(branchName?: string | null): string {
  return [
    "✅ <b>اختبار اتصال ناجح</b>",
    divider(),
    "بوت فالنتينو متصل وجاهز لإرسال تنبيهات الطلبات والمناسبات.",
    branchName ? `🏪 ${escapeHtml(branchName)}` : null,
    divider(),
    "التذكيرات: قبل 3 أيام · قبل يومين · قبل يوم واحد",
  ]
    .filter(Boolean)
    .join("\n");
}
