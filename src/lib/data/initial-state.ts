import { DEFAULT_DELIVERY_ZONES } from "@/lib/constants/delivery-zones";
import { LIBYA_LOCALE } from "@/lib/constants/locale";
import { LOYALTY_TIERS } from "@/lib/constants/loyalty";
import { generateId, nowISO } from "@/lib/utils";
import type { AppState } from "@/types";

const BRANCH_ID = generateId();

/** Production-ready empty store — no demo products, orders, or customers */
export function createInitialState(): AppState {
  const ts = nowISO();
  return {
    version: 4,
    initializedAt: ts,
    settings: {
      branchId: BRANCH_ID,
      branchName: "فالنتينو للشوكولاتة",
      branchAddress: "طرابلس — ليبيا",
      branchPhone: LIBYA_LOCALE.defaultBranchPhone,
      country: LIBYA_LOCALE.country,
      taxRate: 0,
      currency: LIBYA_LOCALE.currency,
      currencySymbol: LIBYA_LOCALE.currencySymbol,
      locale: LIBYA_LOCALE.locale,
      logoUrl: "/images/valentino-logo.png",
      loyaltyPointsPerSar: 1,
      loyaltyRedeemRate: 0.05,
      orderNumberPrefix: "VAL",
      invoiceNumberPrefix: "INV",
      walkInSalesEnabled: true,
      defaultDeliveryFee: 15,
      freeDeliveryThreshold: 200,
      thermalPaperWidth: 80,
      invoiceFooter: "شكراً لاختياركم فالنتينو للشوكولاتة",
      whatsappCountryCode: "218",
      deliveryZones: DEFAULT_DELIVERY_ZONES.map((z) => ({ ...z })),
      autoWhatsAppOnSale: true,
      telegramNotificationsEnabled: true,
      taxNumber: null,
      commercialRegister: null,
      documentCodeEnabled: true,
      documentCodeMode: "invoice_data",
      documentCodeCustomValue: "",
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
