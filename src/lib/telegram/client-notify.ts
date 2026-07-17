/** Fire-and-forget Telegram notify from the browser (no token on client). */

export type TelegramClientNotifyPayload =
  | {
      kind: "order_created";
      orderNumber: string;
      orderId: string;
      customerName: string;
      total: number;
      currencySymbol: string;
      deliveryDate: string | null;
      deliveryTime: string | null;
      typeLabel: string;
      itemCount: number;
      branchId: string;
    }
  | {
      kind: "payment";
      orderNumber: string;
      orderId: string;
      amount: number;
      currencySymbol: string;
      paymentStatus: string;
      branchId: string;
    };

export function notifyTelegramFromClient(
  payload: TelegramClientNotifyPayload,
): void {
  if (typeof window === "undefined") return;
  void fetch("/api/telegram/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
