import type { UserRole } from "@/config/navigation";
import type { AuthSession } from "@/lib/auth";
import {
  alignStoreWithSession,
  getState,
  mergeCloudSnapshot,
} from "@/lib/data/store";
import { getProtectedEntityIds } from "@/lib/data/merge-snapshot";
import {
  mapBatchRow,
  mapCategoryRow,
  mapCouponRow,
  mapCustomerRow,
  mapDiscountRow,
  mapEventRow,
  mapExpenseRow,
  mapAuditLogRow,
  mapInventoryMovementRow,
  mapInvoiceRow,
  mapLoyaltyTierRow,
  mapOrderItemRow,
  mapOrderRow,
  mapOrderStatusHistoryRow,
  mapPaymentRow,
  mapProductRow,
  mapPurchaseOrderItemRow,
  mapPurchaseOrderRow,
  mapReturnItemRow,
  mapReturnRow,
  mapShiftRow,
  mapSupplierRow,
  mapUserProfileRow,
} from "@/lib/data/cloud-mappers";
import { cacheProducts } from "@/lib/offline/db";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Customer, LoyaltyTier, Settings } from "@/types";

export type HydrateProgressStep =
  | "session"
  | "settings"
  | "catalog"
  | "commerce"
  | "ops"
  | "staff"
  | "reminders"
  | "done";

function assertNoError(
  label: string,
  error: { message?: string } | null | undefined,
): void {
  if (error) {
    throw new Error(`${label}: ${error.message ?? "فشل التحميل"}`);
  }
}

function mapUserRoleToRoleKey(role: UserRole) {
  return role === "admin" ? "manager" : role;
}

const LEGACY_TIER_KEYS: Record<string, string> = {
  "tier-bronze": "bronze",
  "tier-silver": "silver",
  "tier-gold": "gold",
  "tier-platinum": "platinum",
  "tier-diamond": "diamond",
};

/** Scoped hydrate domains — realtime can refresh one domain instead of everything */
export type HydrateDomain =
  | "catalog"
  | "commerce"
  | "ops"
  | "staff"
  | "settings";

export const REALTIME_TABLE_DOMAIN: Record<string, HydrateDomain> = {
  products: "catalog",
  batches: "catalog",
  categories: "catalog",
  loyalty_tiers: "catalog",
  orders: "commerce",
  payments: "commerce",
  events: "commerce",
  invoices: "commerce",
  returns: "commerce",
  customers: "commerce",
  discounts: "commerce",
  coupons: "commerce",
  order_status_history: "commerce",
  shifts: "ops",
  expenses: "ops",
  suppliers: "ops",
  purchase_orders: "ops",
  inventory_movements: "ops",
  user_profiles: "staff",
  settings: "settings",
};

const ALL_DOMAINS: HydrateDomain[] = [
  "catalog",
  "commerce",
  "ops",
  "staff",
  "settings",
];

const IN_CHUNK = 100;
const OPEN_ORDERS_LIMIT = 1_000;
const RECENT_CLOSED_ORDERS_LIMIT = 2_000;
const MOVEMENTS_LIMIT = 1_000;
const EXPENSES_LIMIT = 500;
const RETURNS_LIMIT = 500;
const PO_LIMIT = 500;
const INVOICES_LIMIT = 1_000;
const AUDIT_LIMIT = 1_000;
const STATUS_HISTORY_LIMIT = 3_000;

function remapCustomerLoyaltyTiers(
  customers: Customer[],
  tiers: LoyaltyTier[],
): Customer[] {
  if (tiers.length === 0) return customers;
  return customers.map((customer) => {
    const uuidLike =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        customer.loyaltyTierId,
      );
    if (uuidLike) return customer;
    const key =
      LEGACY_TIER_KEYS[customer.loyaltyTierId] ??
      customer.loyaltyTierId.replace(/^tier-/, "");
    const tier = tiers.find((t) => t.key === key || t.id === customer.loyaltyTierId);
    return tier ? { ...customer, loyaltyTierId: tier.id } : customer;
  });
}

function parseSettingsRows(
  rows: Array<{ key: string; value: unknown }>,
  branchId: string,
  branchName?: string,
): Settings {
  const current = getState().settings;
  const app = rows.find((r) => r.key === "app")?.value as
    | Record<string, unknown>
    | undefined;
  const branch = rows.find((r) => r.key === "branch")?.value as
    | Record<string, unknown>
    | undefined;

  return {
    branchId,
    branchName:
      (branch?.branchName as string) ??
      branchName ??
      current.branchName,
    branchAddress:
      (branch?.branchAddress as string) ??
      (branch?.address as string) ??
      current.branchAddress,
    branchPhone:
      (branch?.branchPhone as string) ??
      (branch?.phone as string) ??
      current.branchPhone,
    logoUrl:
      branch?.logoUrl === null || typeof branch?.logoUrl === "string"
        ? (branch.logoUrl as string | null)
        : current.logoUrl,
    country: (app?.country as string) ?? current.country,
    taxRate: typeof app?.taxRate === "number" ? app.taxRate : current.taxRate,
    currency: (app?.currency as string) ?? current.currency,
    currencySymbol:
      (app?.currencySymbol as string) ?? current.currencySymbol,
    locale: (app?.locale as string) ?? current.locale,
    loyaltyPointsPerSar:
      typeof app?.loyaltyPointsPerSar === "number"
        ? app.loyaltyPointsPerSar
        : current.loyaltyPointsPerSar,
    loyaltyRedeemRate:
      typeof app?.loyaltyRedeemRate === "number"
        ? app.loyaltyRedeemRate
        : current.loyaltyRedeemRate,
    orderNumberPrefix:
      (app?.orderNumberPrefix as string) ?? current.orderNumberPrefix,
    invoiceNumberPrefix:
      (app?.invoiceNumberPrefix as string) ?? current.invoiceNumberPrefix,
    walkInSalesEnabled:
      typeof app?.walkInSalesEnabled === "boolean"
        ? app.walkInSalesEnabled
        : typeof app?.walkInEnabled === "boolean"
          ? app.walkInEnabled
          : current.walkInSalesEnabled,
    defaultDeliveryFee:
      typeof app?.defaultDeliveryFee === "number"
        ? app.defaultDeliveryFee
        : typeof app?.deliveryFeeDefault === "number"
          ? app.deliveryFeeDefault
          : current.defaultDeliveryFee,
    freeDeliveryThreshold:
      app?.freeDeliveryThreshold === null ||
      typeof app?.freeDeliveryThreshold === "number"
        ? (app.freeDeliveryThreshold as number | null)
        : current.freeDeliveryThreshold,
    thermalPaperWidth:
      app?.thermalPaperWidth === 58 || app?.thermalPaperWidth === 80
        ? app.thermalPaperWidth
        : current.thermalPaperWidth,
    invoiceFooter:
      (app?.invoiceFooter as string) ?? current.invoiceFooter,
    whatsappCountryCode:
      (app?.whatsappCountryCode as string) ?? current.whatsappCountryCode,
    deliveryZones: Array.isArray(app?.deliveryZones)
      ? (app.deliveryZones as Settings["deliveryZones"])
      : current.deliveryZones,
    autoWhatsAppOnSale:
      typeof app?.autoWhatsAppOnSale === "boolean"
        ? app.autoWhatsAppOnSale
        : current.autoWhatsAppOnSale,
    telegramNotificationsEnabled:
      typeof app?.telegramNotificationsEnabled === "boolean"
        ? app.telegramNotificationsEnabled
        : current.telegramNotificationsEnabled,
    taxNumber:
      app?.taxNumber === null || typeof app?.taxNumber === "string"
        ? (app.taxNumber as string | null)
        : current.taxNumber,
    commercialRegister:
      app?.commercialRegister === null ||
      typeof app?.commercialRegister === "string"
        ? (app.commercialRegister as string | null)
        : current.commercialRegister,
  };
}

type SupabaseClient = NonNullable<ReturnType<typeof createClient>>;

async function fetchByIds(
  supabase: SupabaseClient,
  table: string,
  branchId: string,
  idColumn: string,
  ids: string[],
): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    chunks.push(ids.slice(i, i + IN_CHUNK));
  }
  const parts = await Promise.all(
    chunks.map(async (chunk) => {
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("branch_id", branchId)
        .in(idColumn, chunk);
      return (data ?? []) as Record<string, unknown>[];
    }),
  );
  return parts.flat();
}

export async function hydrateStoreFromSupabase(
  session: AuthSession,
  options?: {
    protectedIds?: Set<string>;
    domains?: HydrateDomain[];
    onProgress?: (step: HydrateProgressStep) => void;
  },
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createClient();
  if (!supabase) return false;

  const protectedIds =
    options?.protectedIds ?? (await getProtectedEntityIds());
  const domains = new Set(options?.domains?.length ? options.domains : ALL_DOMAINS);
  const full = domains.size === ALL_DOMAINS.length;
  const onProgress = options?.onProgress;

  try {
    onProgress?.("settings");
    const { data: branch, error: branchError } = await supabase
      .from("branches")
      .select("id, name, address, phone")
      .eq("id", session.branchId)
      .maybeSingle();
    assertNoError("branches", branchError);

    if (full) {
      alignStoreWithSession({
        branchId: session.branchId,
        branchName: branch?.name ?? undefined,
        userId: session.userId,
        userName: session.name,
        roleKey: mapUserRoleToRoleKey(session.role),
      });
    }

    const branchId = session.branchId;
    const snapshot: Parameters<typeof mergeCloudSnapshot>[0] = {};

    if (domains.has("catalog") || domains.has("commerce")) {
      if (domains.has("catalog")) onProgress?.("catalog");
      const [categoriesRes, productsRes, batchesRes, tiersRes] =
        await Promise.all([
          domains.has("catalog")
            ? supabase.from("categories").select("*").eq("branch_id", branchId)
            : Promise.resolve({ data: null, error: null }),
          domains.has("catalog")
            ? supabase.from("products").select("*").eq("branch_id", branchId)
            : Promise.resolve({ data: null, error: null }),
          domains.has("catalog")
            ? supabase.from("batches").select("*").eq("branch_id", branchId)
            : Promise.resolve({ data: null, error: null }),
          domains.has("catalog") || domains.has("commerce")
            ? supabase.from("loyalty_tiers").select("*").eq("branch_id", branchId)
            : Promise.resolve({ data: null, error: null }),
        ]);

      if (domains.has("catalog")) {
        assertNoError("categories", categoriesRes.error);
        assertNoError("products", productsRes.error);
        assertNoError("batches", batchesRes.error);
        snapshot.categories = (categoriesRes.data ?? []).map((row) =>
          mapCategoryRow(row as Record<string, unknown>),
        );
        snapshot.products = (productsRes.data ?? []).map((row) =>
          mapProductRow(row as Record<string, unknown>),
        );
        snapshot.batches = (batchesRes.data ?? []).map((row) =>
          mapBatchRow(row as Record<string, unknown>),
        );
      }

      const loyaltyTiers = (tiersRes.data ?? []).map((row) =>
        mapLoyaltyTierRow(row as Record<string, unknown>),
      );
      if (loyaltyTiers.length > 0) snapshot.loyaltyTiers = loyaltyTiers;

      if (domains.has("commerce")) {
        onProgress?.("commerce");
        const [
          customersRes,
          openOrdersRes,
          recentOrdersRes,
          eventsRes,
          discountsRes,
          couponsRes,
          returnsRes,
          returnItemsRes,
          invoicesRes,
        ] = await Promise.all([
          supabase.from("customers").select("*").eq("branch_id", branchId),
          supabase
            .from("orders")
            .select("*")
            .eq("branch_id", branchId)
            .is("deleted_at", null)
            .not("status", "in", "(completed,cancelled)")
            .limit(OPEN_ORDERS_LIMIT),
          supabase
            .from("orders")
            .select("*")
            .eq("branch_id", branchId)
            .is("deleted_at", null)
            .in("status", ["completed", "cancelled"])
            .order("created_at", { ascending: false })
            .limit(RECENT_CLOSED_ORDERS_LIMIT),
          supabase.from("events").select("*").eq("branch_id", branchId),
          supabase
            .from("discounts")
            .select("*")
            .eq("branch_id", branchId)
            .is("deleted_at", null),
          supabase
            .from("coupons")
            .select("*")
            .eq("branch_id", branchId)
            .is("deleted_at", null),
          supabase
            .from("returns")
            .select("*")
            .eq("branch_id", branchId)
            .order("created_at", { ascending: false })
            .limit(RETURNS_LIMIT),
          supabase.from("return_items").select("*").eq("branch_id", branchId),
          supabase
            .from("invoices")
            .select("*")
            .eq("branch_id", branchId)
            .order("created_at", { ascending: false })
            .limit(INVOICES_LIMIT),
        ]);

        snapshot.customers = remapCustomerLoyaltyTiers(
          (customersRes.data ?? []).map((row) =>
            mapCustomerRow(row as Record<string, unknown>),
          ),
          loyaltyTiers.length > 0
            ? loyaltyTiers
            : getState().loyaltyTiers,
        );

        const orderRows = new Map<string, Record<string, unknown>>();
        for (const row of [
          ...(openOrdersRes.data ?? []),
          ...(recentOrdersRes.data ?? []),
        ]) {
          const record = row as Record<string, unknown>;
          orderRows.set(String(record.id), record);
        }
        const orderIds = Array.from(orderRows.keys());

        const [orderItemRows, paymentRows, historyRows] = await Promise.all([
          fetchByIds(supabase, "order_items", branchId, "order_id", orderIds),
          fetchByIds(supabase, "payments", branchId, "order_id", orderIds),
          orderIds.length > 0
            ? supabase
                .from("order_status_history")
                .select("*")
                .eq("branch_id", branchId)
                .in(
                  "order_id",
                  orderIds.slice(0, IN_CHUNK),
                )
                .order("changed_at", { ascending: false })
                .limit(STATUS_HISTORY_LIMIT)
                .then(async (first) => {
                  if (orderIds.length <= IN_CHUNK) {
                    return (first.data ?? []) as Record<string, unknown>[];
                  }
                  return fetchByIds(
                    supabase,
                    "order_status_history",
                    branchId,
                    "order_id",
                    orderIds,
                  );
                })
            : Promise.resolve([] as Record<string, unknown>[]),
        ]);

        const itemsByOrder = new Map<
          string,
          ReturnType<typeof mapOrderItemRow>[]
        >();
        for (const record of orderItemRows) {
          const orderId = String(record.order_id);
          const list = itemsByOrder.get(orderId) ?? [];
          list.push(mapOrderItemRow(record, orderId));
          itemsByOrder.set(orderId, list);
        }

        snapshot.orders = Array.from(orderRows.values()).map((record) => {
          const orderId = String(record.id);
          return mapOrderRow(record, itemsByOrder.get(orderId) ?? []);
        });
        snapshot.payments = paymentRows.map((row) => mapPaymentRow(row));
        snapshot.orderStatusHistory = historyRows.map((row) =>
          mapOrderStatusHistoryRow(row),
        );
        snapshot.events = (eventsRes.data ?? []).map((row) =>
          mapEventRow(row as Record<string, unknown>),
        );
        snapshot.discounts = (discountsRes.data ?? []).map((row) =>
          mapDiscountRow(row as Record<string, unknown>),
        );
        snapshot.coupons = (couponsRes.data ?? []).map((row) =>
          mapCouponRow(row as Record<string, unknown>),
        );
        snapshot.invoices = (invoicesRes.data ?? []).map((row) =>
          mapInvoiceRow(row as Record<string, unknown>),
        );

        const itemsByReturn = new Map<
          string,
          ReturnType<typeof mapReturnItemRow>[]
        >();
        for (const row of returnItemsRes.data ?? []) {
          const record = row as Record<string, unknown>;
          const returnId = String(record.return_id);
          const list = itemsByReturn.get(returnId) ?? [];
          list.push(mapReturnItemRow(record, returnId));
          itemsByReturn.set(returnId, list);
        }
        snapshot.returns = (returnsRes.data ?? []).map((row) => {
          const record = row as Record<string, unknown>;
          const returnId = String(record.id);
          return mapReturnRow(record, itemsByReturn.get(returnId) ?? []);
        });
      }
    }

    if (domains.has("ops")) {
      onProgress?.("ops");
      const [
        shiftsRes,
        movementsRes,
        suppliersRes,
        expensesRes,
        purchaseOrdersRes,
        purchaseOrderItemsRes,
        auditLogsRes,
      ] = await Promise.all([
        supabase.from("shifts").select("*").eq("branch_id", branchId),
        supabase
          .from("inventory_movements")
          .select("*")
          .eq("branch_id", branchId)
          .order("created_at", { ascending: false })
          .limit(MOVEMENTS_LIMIT),
        supabase
          .from("suppliers")
          .select("*")
          .eq("branch_id", branchId)
          .is("deleted_at", null),
        supabase
          .from("expenses")
          .select("*")
          .eq("branch_id", branchId)
          .order("expense_date", { ascending: false })
          .limit(EXPENSES_LIMIT),
        supabase
          .from("purchase_orders")
          .select("*")
          .eq("branch_id", branchId)
          .order("created_at", { ascending: false })
          .limit(PO_LIMIT),
        supabase
          .from("purchase_order_items")
          .select("*")
          .eq("branch_id", branchId),
        supabase
          .from("audit_logs")
          .select("*")
          .eq("branch_id", branchId)
          .order("created_at", { ascending: false })
          .limit(AUDIT_LIMIT),
      ]);

      assertNoError("shifts", shiftsRes.error);
      assertNoError("suppliers", suppliersRes.error);

      snapshot.shifts = (shiftsRes.data ?? []).map((row) =>
        mapShiftRow(row as Record<string, unknown>),
      );
      snapshot.inventoryMovements = (movementsRes.data ?? []).map((row) =>
        mapInventoryMovementRow(row as Record<string, unknown>),
      );
      snapshot.suppliers = (suppliersRes.data ?? []).map((row) =>
        mapSupplierRow(row as Record<string, unknown>),
      );
      snapshot.expenses = (expensesRes.data ?? []).map((row) =>
        mapExpenseRow(row as Record<string, unknown>),
      );
      snapshot.auditLogs = (auditLogsRes.data ?? []).map((row) =>
        mapAuditLogRow(row as Record<string, unknown>),
      );

      const itemsByPurchaseOrder = new Map<
        string,
        ReturnType<typeof mapPurchaseOrderItemRow>[]
      >();
      for (const row of purchaseOrderItemsRes.data ?? []) {
        const record = row as Record<string, unknown>;
        const purchaseOrderId = String(record.purchase_order_id);
        const list = itemsByPurchaseOrder.get(purchaseOrderId) ?? [];
        list.push(mapPurchaseOrderItemRow(record, purchaseOrderId));
        itemsByPurchaseOrder.set(purchaseOrderId, list);
      }
      snapshot.purchaseOrders = (purchaseOrdersRes.data ?? []).map((row) => {
        const record = row as Record<string, unknown>;
        const purchaseOrderId = String(record.id);
        return mapPurchaseOrderRow(
          record,
          itemsByPurchaseOrder.get(purchaseOrderId) ?? [],
        );
      });
    }

    if (domains.has("staff")) {
      onProgress?.("staff");
      const profilesRes = await supabase
        .from("user_profiles")
        .select("*")
        .eq("branch_id", branchId);
      assertNoError("user_profiles", profilesRes.error);
      snapshot.users = (profilesRes.data ?? []).map((row) =>
        mapUserProfileRow(row as Record<string, unknown>),
      );
    }

    if (domains.has("settings")) {
      onProgress?.("settings");
      const settingsRes = await supabase
        .from("settings")
        .select("key, value")
        .eq("branch_id", branchId);
      assertNoError("settings", settingsRes.error);
      const parsed = parseSettingsRows(
        (settingsRes.data ?? []) as Array<{ key: string; value: unknown }>,
        branchId,
        branch?.name,
      );
      if (branch?.phone && (!parsed.branchPhone || parsed.branchPhone === "+218")) {
        parsed.branchPhone = String(branch.phone);
      }
      snapshot.settings = parsed;
    }

    mergeCloudSnapshot(snapshot, protectedIds);

    if (snapshot.products) {
      await cacheProducts(snapshot.products);
    }
    onProgress?.("done");
    return true;
  } catch (error) {
    console.error("[hydrate]", error);
    return false;
  }
}
