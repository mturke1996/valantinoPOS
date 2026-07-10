import { LIBYA_LOCALE } from "@/lib/constants/locale";
import { LOYALTY_TIERS } from "@/lib/constants/loyalty";
import { generateId, nowISO } from "@/lib/utils";
import type { AppState } from "@/types";

const BRANCH_ID = generateId();

/** Production-ready empty store — no demo products, orders, or customers */
export function createInitialState(): AppState {
  const ts = nowISO();
  return {
    version: 2,
    initializedAt: ts,
    settings: {
      branchId: BRANCH_ID,
      branchName: "فالنتينو للشوكولاتة",
      branchAddress: "طرابلس — ليبيا",
      branchPhone: LIBYA_LOCALE.phonePrefix,
      country: LIBYA_LOCALE.country,
      taxRate: 0,
      currency: LIBYA_LOCALE.currency,
      currencySymbol: LIBYA_LOCALE.currencySymbol,
      locale: LIBYA_LOCALE.locale,
      logoUrl: null,
      loyaltyPointsPerSar: 1,
      loyaltyRedeemRate: 0.05,
      orderNumberPrefix: "VAL",
      invoiceNumberPrefix: "INV",
    },
    products: [],
    categories: [],
    customers: [],
    orders: [],
    events: [],
    batches: [],
    inventoryMovements: [],
    shifts: [],
    payments: [],
    invoices: [],
    suppliers: [],
    purchaseOrders: [],
    expenses: [],
    returns: [],
    discounts: [],
    coupons: [],
    notifications: [],
    auditLogs: [],
    loyaltyTiers: [...LOYALTY_TIERS],
    loyaltyPointsLog: [],
    users: [],
    orderStatusHistory: [],
  };
}
