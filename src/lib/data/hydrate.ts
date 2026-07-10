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
      (branch?.branchAddress as string) ?? current.branchAddress,
    branchPhone: (branch?.branchPhone as string) ?? current.branchPhone,
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
  };
}

export async function hydrateStoreFromSupabase(
  session: AuthSession,
  options?: { protectedIds?: Set<string> },
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createClient();
  if (!supabase) return false;

  const protectedIds =
    options?.protectedIds ?? (await getProtectedEntityIds());

  try {
    const { data: branch } = await supabase
      .from("branches")
      .select("id, name, address, phone")
      .eq("id", session.branchId)
      .maybeSingle();

    alignStoreWithSession({
      branchId: session.branchId,
      branchName: branch?.name ?? undefined,
      userId: session.userId,
      userName: session.name,
      roleKey: mapUserRoleToRoleKey(session.role),
    });

    const branchId = session.branchId;

    const [
      categoriesRes,
      productsRes,
      customersRes,
      batchesRes,
      shiftsRes,
      ordersRes,
      orderItemsRes,
      paymentsRes,
      eventsRes,
      movementsRes,
      profilesRes,
      settingsRes,
      tiersRes,
      suppliersRes,
      expensesRes,
      returnsRes,
      returnItemsRes,
      discountsRes,
      couponsRes,
      purchaseOrdersRes,
      purchaseOrderItemsRes,
      invoicesRes,
      auditLogsRes,
    ] = await Promise.all([
      supabase.from("categories").select("*").eq("branch_id", branchId),
      supabase.from("products").select("*").eq("branch_id", branchId),
      supabase.from("customers").select("*").eq("branch_id", branchId),
      supabase.from("batches").select("*").eq("branch_id", branchId),
      supabase.from("shifts").select("*").eq("branch_id", branchId),
      supabase
        .from("orders")
        .select("*")
        .eq("branch_id", branchId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("order_items").select("*").eq("branch_id", branchId),
      supabase.from("payments").select("*").eq("branch_id", branchId),
      supabase.from("events").select("*").eq("branch_id", branchId),
      supabase
        .from("inventory_movements")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("user_profiles").select("*").eq("branch_id", branchId),
      supabase.from("settings").select("key, value").eq("branch_id", branchId),
      supabase.from("loyalty_tiers").select("*").eq("branch_id", branchId),
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
        .limit(300),
      supabase
        .from("returns")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("return_items").select("*").eq("branch_id", branchId),
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
        .from("purchase_orders")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("purchase_order_items").select("*").eq("branch_id", branchId),
      supabase
        .from("invoices")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const categories = (categoriesRes.data ?? []).map((row) =>
      mapCategoryRow(row as Record<string, unknown>),
    );
    const products = (productsRes.data ?? []).map((row) =>
      mapProductRow(row as Record<string, unknown>),
    );
    const loyaltyTiers = (tiersRes.data ?? []).map((row) =>
      mapLoyaltyTierRow(row as Record<string, unknown>),
    );
    const customers = remapCustomerLoyaltyTiers(
      (customersRes.data ?? []).map((row) =>
        mapCustomerRow(row as Record<string, unknown>),
      ),
      loyaltyTiers,
    );
    const batches = (batchesRes.data ?? []).map((row) =>
      mapBatchRow(row as Record<string, unknown>),
    );
    const shifts = (shiftsRes.data ?? []).map((row) =>
      mapShiftRow(row as Record<string, unknown>),
    );

    const itemsByOrder = new Map<string, ReturnType<typeof mapOrderItemRow>[]>();
    for (const row of orderItemsRes.data ?? []) {
      const record = row as Record<string, unknown>;
      const orderId = String(record.order_id);
      const list = itemsByOrder.get(orderId) ?? [];
      list.push(mapOrderItemRow(record, orderId));
      itemsByOrder.set(orderId, list);
    }

    const orders = (ordersRes.data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const orderId = String(record.id);
      return mapOrderRow(record, itemsByOrder.get(orderId) ?? []);
    });

    const payments = (paymentsRes.data ?? []).map((row) =>
      mapPaymentRow(row as Record<string, unknown>),
    );
    const events = (eventsRes.data ?? []).map((row) =>
      mapEventRow(row as Record<string, unknown>),
    );
    const inventoryMovements = (movementsRes.data ?? []).map((row) =>
      mapInventoryMovementRow(row as Record<string, unknown>),
    );
    const users = (profilesRes.data ?? []).map((row) =>
      mapUserProfileRow(row as Record<string, unknown>),
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

    const returns = (returnsRes.data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const returnId = String(record.id);
      return mapReturnRow(record, itemsByReturn.get(returnId) ?? []);
    });

    const settingsPatch = parseSettingsRows(
      (settingsRes.data ?? []) as Array<{ key: string; value: unknown }>,
      branchId,
      branch?.name,
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

    const purchaseOrders = (purchaseOrdersRes.data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const purchaseOrderId = String(record.id);
      return mapPurchaseOrderRow(
        record,
        itemsByPurchaseOrder.get(purchaseOrderId) ?? [],
      );
    });

    const invoices = (invoicesRes.data ?? []).map((row) =>
      mapInvoiceRow(row as Record<string, unknown>),
    );
    const auditLogs = (auditLogsRes.data ?? []).map((row) =>
      mapAuditLogRow(row as Record<string, unknown>),
    );

    mergeCloudSnapshot(
      {
        categories,
        products,
        customers,
        batches,
        shifts,
        orders,
        payments,
        events,
        inventoryMovements,
        users,
        loyaltyTiers:
          loyaltyTiers.length > 0 ? loyaltyTiers : undefined,
        suppliers: (suppliersRes.data ?? []).map((row) =>
          mapSupplierRow(row as Record<string, unknown>),
        ),
        expenses: (expensesRes.data ?? []).map((row) =>
          mapExpenseRow(row as Record<string, unknown>),
        ),
        returns,
        discounts: (discountsRes.data ?? []).map((row) =>
          mapDiscountRow(row as Record<string, unknown>),
        ),
        coupons: (couponsRes.data ?? []).map((row) =>
          mapCouponRow(row as Record<string, unknown>),
        ),
        purchaseOrders,
        invoices,
        auditLogs,
        settings: settingsPatch,
      },
      protectedIds,
    );

    await cacheProducts(products);
    return true;
  } catch {
    return false;
  }
}
