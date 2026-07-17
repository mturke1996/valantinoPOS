import { describe, expect, it } from "vitest";

import {
  orderTypeLabel,
  scheduleTitle,
} from "@/components/documents/order-labels";
import type { Event, Order } from "@/types";

describe("order-labels", () => {
  it("resolves delivery and event labels for WhatsApp messages", () => {
    const delivery = { type: "delivery", deliveryAddress: "x" } as Order;
    expect(orderTypeLabel(delivery)).toBe("توصيل");
    expect(scheduleTitle(delivery)).toBe("موعد التوصيل");

    const eventOrder = { type: "event" } as Order;
    const event = { eventType: "wedding" } as Event;
    expect(orderTypeLabel(eventOrder, event)).toBe("زفاف");
  });
});
