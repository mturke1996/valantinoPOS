import type { Event, Order } from "@/types";

export interface DocumentNoteEntry {
  key: string;
  label: string;
  text: string;
}

function pushUnique(
  entries: DocumentNoteEntry[],
  entry: DocumentNoteEntry,
): void {
  const text = entry.text.trim();
  if (!text) return;
  if (entries.some((item) => item.text === text)) return;
  entries.push({ ...entry, text });
}

/** Structured notes for invoices / receipts — deduped and labeled. */
export function collectDocumentNotes(
  order: Order,
  event?: Event | null,
): DocumentNoteEntry[] {
  const entries: DocumentNoteEntry[] = [];

  if (order.deliveryInstructions?.trim()) {
    pushUnique(entries, {
      key: "delivery",
      label: "تعليمات التسليم",
      text: order.deliveryInstructions,
    });
  }

  if (event?.giftCardMessage?.trim()) {
    pushUnique(entries, {
      key: "gift",
      label: "بطاقة الإهداء",
      text: event.giftCardMessage,
    });
  }

  if (event?.specialNotes?.trim()) {
    pushUnique(entries, {
      key: "event-prep",
      label: "تعليمات التجهيز",
      text: event.specialNotes,
    });
  }

  if (order.notes?.trim()) {
    pushUnique(entries, {
      key: "order",
      label: event ? "ملاحظات إضافية" : "ملاحظات الطلب",
      text: order.notes,
    });
  }

  return entries;
}

export function hasDocumentNotes(
  order: Order,
  event?: Event | null,
): boolean {
  return collectDocumentNotes(order, event).length > 0;
}
