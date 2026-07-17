import { describe, expect, it } from "vitest";

import {
  computeAuditStats,
  groupPresentedAuditLogs,
  presentAuditLog,
} from "@/lib/audit/present-audit-log";
import { createInitialState } from "@/lib/data/initial-state";
import type { AuditLog } from "@/types";

function makeLog(partial: Partial<AuditLog> & Pick<AuditLog, "action">): AuditLog {
  return {
    id: partial.id ?? "log-1",
    userId: partial.userId ?? null,
    action: partial.action,
    entityType: partial.entityType ?? "order",
    entityId: partial.entityId ?? "order-1",
    oldValues: partial.oldValues ?? null,
    newValues: partial.newValues ?? null,
    createdAt: partial.createdAt ?? new Date().toISOString(),
  };
}

describe("presentAuditLog", () => {
  it("formats order status updates in Arabic", () => {
    const state = createInitialState();

    const presented = presentAuditLog(
      makeLog({
        action: "order.update_status",
        entityType: "order",
        entityId: "order-1",
        oldValues: { status: "preparing" },
        newValues: { status: "packaging", orderNumber: "ORD-100" },
      }),
      state,
    );

    expect(presented.actionLabel).toBe("تحديث حالة الطلب");
    expect(presented.entityLabel).toBe("ORD-100");
    expect(presented.summary).toContain("قيد التحضير");
    expect(presented.summary).toContain("قيد التغليف");
    expect(presented.actorName).toBe("النظام");
  });

  it("groups and counts stats", () => {
    const state = createInitialState();
    const now = new Date().toISOString();
    const items = [
      presentAuditLog(
        makeLog({
          id: "a",
          action: "order.create",
          newValues: { orderNumber: "A-1", total: 10 },
          createdAt: now,
        }),
        state,
      ),
      presentAuditLog(
        makeLog({
          id: "b",
          action: "payment.process",
          entityType: "payment",
          newValues: { paidAmount: 10, method: "cash" },
          createdAt: now,
        }),
        state,
      ),
    ];

    const groups = groupPresentedAuditLogs(items);
    const stats = computeAuditStats(items);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items).toHaveLength(2);
    expect(stats.total).toBe(2);
    expect(stats.today).toBe(2);
    expect(stats.orders).toBe(1);
    expect(stats.payments).toBe(1);
  });
});
