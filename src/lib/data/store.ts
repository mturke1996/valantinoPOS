import { isValidStatusTransition } from "@/lib/constants/order-status";
import { createInitialState } from "@/lib/data/initial-state";
import { createSeedState } from "@/lib/data/seed";
import { formatMoneyLabel } from "@/lib/formatters";
import { buildInvoiceQrPayload } from "@/lib/services/invoice.service";
import {
  addMovement,
  fefoDeduct,
  getAvailableStock,
  getTotalStock,
} from "@/lib/services/inventory.service";
import { earnPoints, redeemPoints } from "@/lib/services/loyalty.service";
import {
  calculateLineTotal,
  calculateOrderTotals,
  resolveUnitPrice,
} from "@/lib/services/pricing.service";
import type {
  AppState,
  AuditLog,
  Batch,
  Category,
  Coupon,
  CreateOrderInput,
  CreateReturnInput,
  Customer,
  Discount,
  Event,
  Expense,
  InventoryMovement,
  Invoice,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  ProcessPaymentInput,
  Product,
  PurchaseOrder,
  RefundMethod,
  Return,
  ReturnItem,
  RoleKey,
  Shift,
  Supplier,
  Notification,
  UserProfile,
} from "@/types";
import { generateId, nowISO, roundMoney } from "@/lib/utils";

const STORAGE_KEY = "valentino-pos-state";
const STATE_VERSION = 2;

type Listener = (state: AppState) => void;
const listeners = new Set<Listener>();

let memoryCache: AppState | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

type StoreSyncAction =
  | "create_order"
  | "process_payment"
  | "update_status"
  | "create_category"
  | "create_customer"
  | "update_customer"
  | "create_product"
  | "update_product"
  | "receive_inventory"
  | "open_shift"
  | "close_shift"
  | "update_batches"
  | "sync_order_items"
  | "update_event_booking"
  | "update_category"
  | "create_return"
  | "sync_settings"
  | "create_supplier"
  | "update_supplier"
  | "create_expense"
  | "create_discount"
  | "update_discount"
  | "create_coupon"
  | "update_coupon"
  | "create_purchase_order"
  | "update_purchase_order"
  | "create_inventory_movement"
  | "create_audit_log"
  | "create_invoice"
  | "update_invoice";

function queueMovementsSync(
  movements: InventoryMovement | InventoryMovement[],
): void {
  const list = Array.isArray(movements) ? movements : [movements];
  for (const movement of list) {
    queueStoreSync("create_inventory_movement", { movement });
  }
}

function queueStoreSync(action: StoreSyncAction, payload: unknown): void {
  if (!isBrowser()) return;
  void import("@/lib/offline/db")
    .then(async ({ enqueueSync }) => {
      await enqueueSync(action, payload);
      if (navigator.onLine) {
        const { flushOfflineSyncQueue } = await import("@/lib/offline/sync");
        void flushOfflineSyncQueue().catch(() => undefined);
      }
    })
    .catch(() => {
      // The authoritative local write already succeeded; the queue retries later.
    });
}

function syncProductStock(state: AppState): AppState {
  const products = state.products.map((p) => ({
    ...p,
    imageUrl: p.imageUrl ?? null,
    trackStock: p.trackStock ?? p.stockQuantity > 0,
    stockQuantity: getTotalStock(state.batches, p.id),
  }));
  return { ...state, products };
}

import { mergeRecordsById } from "@/lib/data/merge-snapshot";

export function getState(): AppState {
  if (memoryCache) return memoryCache;

  if (!isBrowser()) {
    memoryCache = createInitialState();
    return memoryCache;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    memoryCache = createInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
    return memoryCache;
  }

  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.version || parsed.version < STATE_VERSION) {
      memoryCache = createInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
      return memoryCache;
    }
    memoryCache = syncProductStock(parsed);
    return memoryCache;
  } catch {
    memoryCache = createInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
    return memoryCache;
  }
}

export function setState(state: AppState): void {
  const synced = syncProductStock({ ...state, version: STATE_VERSION });
  memoryCache = synced;
  if (isBrowser()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
  }
  notify(synced);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(state: AppState): void {
  listeners.forEach((l) => l(state));
}

function update(mutator: (state: AppState) => AppState): AppState {
  const current = getState();
  const next = mutator(current);
  if (next === current) return current;
  setState(next);
  return next;
}

export function initializeStore(): AppState {
  const initial = createInitialState();
  setState(initial);
  return initial;
}

/** @deprecated Use initializeStore — kept for test compatibility */
export function initializeFromSeed(): AppState {
  const seed = createSeedState();
  setState(seed);
  return seed;
}

export function resetStore(): void {
  if (isBrowser()) {
    localStorage.removeItem(STORAGE_KEY);
  }
  memoryCache = null;
  initializeStore();
}

export function alignStoreWithSession(params: {
  branchId: string;
  branchName?: string;
  userId: string;
  userName: string;
  roleKey: RoleKey;
}): void {
  const branchChanged = getState().settings.branchId !== params.branchId;
  if (branchChanged && isBrowser()) {
    void import("@/lib/offline/db")
      .then(({ clearSyncQueue }) => clearSyncQueue())
      .catch(() => undefined);
  }
  update((state) => {
    const base = branchChanged ? createInitialState() : { ...state };
    const existingUser = state.users.find((u) => u.id === params.userId);
    const user: UserProfile = {
      id: params.userId,
      branchId: params.branchId,
      roleKey: params.roleKey,
      fullName: params.userName,
      phone: existingUser?.phone ?? null,
      avatarUrl: existingUser?.avatarUrl ?? null,
      isActive: true,
      createdAt: existingUser?.createdAt ?? nowISO(),
    };
    return {
      ...base,
      settings: {
        ...base.settings,
        branchId: params.branchId,
        branchName: params.branchName ?? base.settings.branchName,
      },
      users: [user],
    };
  });
}

export function mergeCloudSnapshot(
  partial: Partial<AppState>,
  protectedIds: Set<string> = new Set(),
): void {
  update((state) => {
    const next: AppState = {
      ...state,
      categories: partial.categories
        ? mergeRecordsById(state.categories, partial.categories, protectedIds)
        : state.categories,
      products: partial.products
        ? mergeRecordsById(state.products, partial.products, protectedIds)
        : state.products,
      customers: partial.customers
        ? mergeRecordsById(state.customers, partial.customers, protectedIds)
        : state.customers,
      batches: partial.batches
        ? mergeRecordsById(state.batches, partial.batches, protectedIds)
        : state.batches,
      shifts: partial.shifts
        ? mergeRecordsById(state.shifts, partial.shifts, protectedIds)
        : state.shifts,
      orders: partial.orders
        ? mergeRecordsById(state.orders, partial.orders, protectedIds)
        : state.orders,
      events: partial.events
        ? mergeRecordsById(state.events, partial.events, protectedIds)
        : state.events,
      payments: partial.payments
        ? mergeRecordsById(state.payments, partial.payments, protectedIds)
        : state.payments,
      inventoryMovements: partial.inventoryMovements
        ? mergeRecordsById(
            state.inventoryMovements,
            partial.inventoryMovements,
            protectedIds,
          )
        : state.inventoryMovements,
      suppliers: partial.suppliers
        ? mergeRecordsById(state.suppliers, partial.suppliers, protectedIds)
        : state.suppliers,
      expenses: partial.expenses
        ? mergeRecordsById(state.expenses, partial.expenses, protectedIds)
        : state.expenses,
      returns: partial.returns
        ? mergeRecordsById(state.returns, partial.returns, protectedIds)
        : state.returns,
      discounts: partial.discounts
        ? mergeRecordsById(state.discounts, partial.discounts, protectedIds)
        : state.discounts,
      coupons: partial.coupons
        ? mergeRecordsById(state.coupons, partial.coupons, protectedIds)
        : state.coupons,
      purchaseOrders: partial.purchaseOrders
        ? mergeRecordsById(
            state.purchaseOrders,
            partial.purchaseOrders,
            protectedIds,
          )
        : state.purchaseOrders,
      invoices: partial.invoices
        ? mergeRecordsById(state.invoices, partial.invoices, protectedIds)
        : state.invoices,
      auditLogs: partial.auditLogs
        ? mergeRecordsById(state.auditLogs, partial.auditLogs, protectedIds)
        : state.auditLogs,
      loyaltyTiers: partial.loyaltyTiers ?? state.loyaltyTiers,
      users:
        partial.users && partial.users.length > 0
          ? partial.users
          : state.users,
      settings: partial.settings
        ? { ...state.settings, ...partial.settings }
        : state.settings,
    };
    return syncProductStock(next);
  });
}

function nextReturnNumber(state: AppState): string {
  const count = state.returns.length + 1;
  return `RET-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
}

function appendAudit(
  state: AppState,
  log: Omit<AuditLog, "id" | "createdAt">,
): AppState {
  const entry: AuditLog = {
    ...log,
    id: generateId(),
    createdAt: nowISO(),
  };
  queueStoreSync("create_audit_log", {
    log: entry,
    branchId: state.settings.branchId,
  });
  return {
    ...state,
    auditLogs: [entry, ...state.auditLogs].slice(0, 500),
  };
}

function nextOrderNumber(state: AppState): string {
  const prefix = state.settings.orderNumberPrefix;
  const year = new Date().getFullYear();
  const count = state.orders.length + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
}

function nextInvoiceNumber(state: AppState): string {
  const prefix = state.settings.invoiceNumberPrefix;
  const year = new Date().getFullYear();
  const count = state.invoices.length + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
}

function resolvePaymentStatus(
  paidAmount: number,
  total: number,
): Order["paymentStatus"] {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= total) return "paid";
  return "partial";
}

// ─── Products CRUD ───────────────────────────────────────────────────────────

type ProductInput = Omit<
  Product,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "stockQuantity" | "imageUrl"
> & {
  imageUrl?: string | null;
};

function normalizeProductInput(data: ProductInput): ProductInput {
  return {
    ...data,
    imageUrl: data.imageUrl ?? null,
    sku: data.sku.trim().toUpperCase(),
    barcode: data.barcode.trim(),
    nameAr: data.nameAr.trim(),
    nameEn: data.nameEn?.trim() || null,
    description: data.description.trim(),
    origin: data.origin.trim(),
    costPrice: roundMoney(data.costPrice),
    retailPrice: roundMoney(data.retailPrice),
    wholesalePrice: roundMoney(data.wholesalePrice),
    weightGrams:
      data.weightGrams === null
        ? null
        : Math.round(data.weightGrams * 1000) / 1000,
    minStock: Math.max(0, Math.floor(data.minStock)),
  };
}

function validateProductInput(
  state: AppState,
  data: ProductInput,
  excludingId?: string,
): void {
  if (data.nameAr.length < 2) {
    throw new Error("اسم الصنف مطلوب ويجب أن يتكون من حرفين على الأقل");
  }
  if (!data.branchId) throw new Error("الفرع مطلوب");
  if (!data.sku) throw new Error("رمز SKU مطلوب");
  if (!data.categoryId) throw new Error("اختر فئة للصنف");
  if (
    !state.categories.some(
      (category) =>
        category.id === data.categoryId &&
        category.branchId === data.branchId &&
        !category.deletedAt,
    )
  ) {
    throw new Error("الفئة المحددة غير صالحة لهذا الفرع");
  }
  if (
    !Number.isFinite(data.costPrice) ||
    !Number.isFinite(data.retailPrice) ||
    !Number.isFinite(data.wholesalePrice) ||
    data.costPrice < 0 ||
    data.retailPrice <= 0 ||
    data.wholesalePrice < 0
  ) {
    throw new Error("تحقق من أسعار التكلفة والبيع والجملة");
  }
  if (!Number.isFinite(data.minStock) || data.minStock < 0) {
    throw new Error("الحد الأدنى للمخزون غير صالح");
  }
  if (
    data.weightGrams !== null &&
    (!Number.isFinite(data.weightGrams) || data.weightGrams <= 0)
  ) {
    throw new Error("الوزن يجب أن يكون أكبر من صفر");
  }

  const duplicateSku = state.products.find(
    (product) =>
      product.id !== excludingId &&
      product.branchId === data.branchId &&
      product.sku.trim().toUpperCase() === data.sku,
  );
  if (duplicateSku) throw new Error("رمز SKU مستخدم لصنف آخر");

  if (data.barcode) {
    const duplicateBarcode = state.products.find(
      (product) =>
        product.id !== excludingId &&
        product.branchId === data.branchId &&
        product.barcode.trim() === data.barcode,
    );
    if (duplicateBarcode) throw new Error("الباركود مستخدم لصنف آخر");
  }
}

export function getProducts(): Product[] {
  return getState().products.filter((p) => !p.deletedAt);
}

export function getProductById(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

export function createProduct(
  data: ProductInput,
): Product {
  const state = getState();
  const normalized = normalizeProductInput(data);
  validateProductInput(state, normalized);
  const product: Product = {
    ...normalized,
    imageUrl: normalized.imageUrl ?? null,
    id: generateId(),
    stockQuantity: 0,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    deletedAt: null,
  };
  const nextState = appendAudit(
    {
      ...state,
      products: [...state.products, product],
    },
    {
      userId: null,
      action: "product.create",
      entityType: "product",
      entityId: product.id,
      oldValues: null,
      newValues: {
        sku: product.sku,
        nameAr: product.nameAr,
        retailPrice: product.retailPrice,
      },
    },
  );
  setState(nextState);
  queueStoreSync("create_product", { product });
  return product;
}

export function updateProduct(
  id: string,
  patch: Partial<Omit<Product, "id" | "createdAt" | "stockQuantity">>,
): Product | null {
  const state = getState();
  const current = state.products.find((product) => product.id === id);
  if (!current) return null;

  const normalized = normalizeProductInput({
    branchId: patch.branchId ?? current.branchId,
    categoryId: patch.categoryId ?? current.categoryId,
    sku: patch.sku ?? current.sku,
    barcode: patch.barcode ?? current.barcode,
    nameAr: patch.nameAr ?? current.nameAr,
    nameEn: patch.nameEn === undefined ? current.nameEn : patch.nameEn,
    description: patch.description ?? current.description,
    costPrice: patch.costPrice ?? current.costPrice,
    retailPrice: patch.retailPrice ?? current.retailPrice,
    wholesalePrice: patch.wholesalePrice ?? current.wholesalePrice,
    unitType: patch.unitType ?? current.unitType,
    weightGrams:
      patch.weightGrams === undefined
        ? current.weightGrams
        : patch.weightGrams,
    origin: patch.origin ?? current.origin,
    minStock: patch.minStock ?? current.minStock,
    isBundle: patch.isBundle ?? current.isBundle,
    isActive: patch.isActive ?? current.isActive,
    trackStock: patch.trackStock ?? current.trackStock,
  });
  validateProductInput(state, normalized, id);

  const updated: Product = {
    ...current,
    ...normalized,
    deletedAt:
      patch.deletedAt === undefined ? current.deletedAt : patch.deletedAt,
    updatedAt: nowISO(),
  };
  const nextState = appendAudit(
    {
      ...state,
      products: state.products.map((product) =>
        product.id === id ? updated : product,
      ),
    },
    {
      userId: null,
      action: "product.update",
      entityType: "product",
      entityId: id,
      oldValues: {
        sku: current.sku,
        retailPrice: current.retailPrice,
        isActive: current.isActive,
      },
      newValues: {
        sku: updated.sku,
        retailPrice: updated.retailPrice,
        isActive: updated.isActive,
      },
    },
  );
  setState(nextState);
  queueStoreSync("update_product", { product: updated });
  return updated;
}

export function deleteProduct(id: string): boolean {
  return updateProduct(id, { deletedAt: nowISO(), isActive: false }) !== null;
}

// ─── Categories CRUD ─────────────────────────────────────────────────────────

export function getCategories(): Category[] {
  return getState().categories.filter((c) => !c.deletedAt);
}

export function createCategory(
  data: Omit<Category, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Category {
  const state = getState();
  const nameAr = data.nameAr.trim();
  const nameEn = data.nameEn?.trim() || null;
  const slug = data.slug.trim().toLowerCase();
  if (nameAr.length < 2) throw new Error("اسم الفئة مطلوب");
  if (!slug) throw new Error("رابط الفئة المختصر مطلوب");
  if (
    state.categories.some(
      (category) =>
        category.branchId === data.branchId &&
        !category.deletedAt &&
        (category.nameAr === nameAr || category.slug === slug),
    )
  ) {
    throw new Error("اسم الفئة أو رابطها مستخدم مسبقاً");
  }
  if (
    data.parentId &&
    !state.categories.some(
      (category) =>
        category.id === data.parentId &&
        category.branchId === data.branchId &&
        !category.deletedAt,
    )
  ) {
    throw new Error("الفئة الرئيسية غير صالحة");
  }

  const category: Category = {
    ...data,
    nameAr,
    nameEn,
    slug,
    id: generateId(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    deletedAt: null,
  };
  const nextState = appendAudit(
    {
      ...state,
      categories: [...state.categories, category],
    },
    {
      userId: null,
      action: "category.create",
      entityType: "category",
      entityId: category.id,
      oldValues: null,
      newValues: { nameAr: category.nameAr, slug: category.slug },
    },
  );
  setState(nextState);
  queueStoreSync("create_category", { category });
  return category;
}

export function updateCategory(
  id: string,
  patch: Partial<Omit<Category, "id" | "createdAt">>,
): Category | null {
  let updated: Category | null = null;
  update((s) => {
    const categories = s.categories.map((c) => {
      if (c.id !== id) return c;
      updated = { ...c, ...patch, updatedAt: nowISO() };
      return updated;
    });
    return updated ? { ...s, categories } : s;
  });
  if (updated) queueStoreSync("update_category", { category: updated });
  return updated;
}

// ─── Customers CRUD ────────────────────────────────────────────────────────────

type CustomerInput = Omit<
  Customer,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "loyaltyPoints"
  | "totalSpent"
  | "orderCount"
  | "lastOrderAt"
>;

function normalizeCustomerInput(data: CustomerInput): CustomerInput {
  return {
    ...data,
    name: data.name.trim(),
    phone: data.phone.replace(/\s+/g, ""),
    whatsapp: data.whatsapp?.replace(/\s+/g, "") || null,
    email: data.email?.trim().toLowerCase() || null,
    notes: data.notes?.trim() || null,
  };
}

function validateCustomerInput(
  state: AppState,
  data: CustomerInput,
  excludingId?: string,
): void {
  if (data.name.length < 2) throw new Error("اسم العميل مطلوب");
  if (!/^\+?\d{8,15}$/.test(data.phone)) {
    throw new Error("رقم هاتف العميل غير صالح");
  }
  if (data.whatsapp && !/^\+?\d{8,15}$/.test(data.whatsapp)) {
    throw new Error("رقم واتساب العميل غير صالح");
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error("البريد الإلكتروني غير صالح");
  }
  if (
    !state.loyaltyTiers.some((tier) => tier.id === data.loyaltyTierId)
  ) {
    throw new Error("فئة الولاء المحددة غير صالحة");
  }
  if (
    state.customers.some(
      (customer) =>
        customer.id !== excludingId &&
        customer.branchId === data.branchId &&
        !customer.deletedAt &&
        customer.phone === data.phone,
    )
  ) {
    throw new Error("رقم الهاتف مسجل لعميل آخر");
  }
}

export function getCustomers(): Customer[] {
  return getState().customers.filter((c) => !c.deletedAt);
}

export function getCustomerById(id: string): Customer | undefined {
  return getCustomers().find((c) => c.id === id);
}

export function createCustomer(
  data: CustomerInput,
): Customer {
  const state = getState();
  const normalized = normalizeCustomerInput(data);
  validateCustomerInput(state, normalized);
  const customer: Customer = {
    ...normalized,
    id: generateId(),
    loyaltyPoints: 0,
    totalSpent: 0,
    orderCount: 0,
    lastOrderAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    deletedAt: null,
  };
  const nextState = appendAudit(
    {
      ...state,
      customers: [...state.customers, customer],
    },
    {
      userId: null,
      action: "customer.create",
      entityType: "customer",
      entityId: customer.id,
      oldValues: null,
      newValues: { name: customer.name, phone: customer.phone },
    },
  );
  setState(nextState);
  queueStoreSync("create_customer", { customer });
  return customer;
}

export function updateCustomer(
  id: string,
  patch: Partial<Omit<Customer, "id" | "createdAt">>,
): Customer | null {
  const state = getState();
  const current = state.customers.find((customer) => customer.id === id);
  if (!current) return null;
  const normalized = normalizeCustomerInput({
    branchId: patch.branchId ?? current.branchId,
    name: patch.name ?? current.name,
    phone: patch.phone ?? current.phone,
    whatsapp:
      patch.whatsapp === undefined ? current.whatsapp : patch.whatsapp,
    email: patch.email === undefined ? current.email : patch.email,
    notes: patch.notes === undefined ? current.notes : patch.notes,
    birthday:
      patch.birthday === undefined ? current.birthday : patch.birthday,
    loyaltyTierId: patch.loyaltyTierId ?? current.loyaltyTierId,
    wholesalePricing:
      patch.wholesalePricing ?? current.wholesalePricing,
  });
  validateCustomerInput(state, normalized, id);

  const updated: Customer = {
    ...current,
    ...normalized,
    loyaltyPoints: patch.loyaltyPoints ?? current.loyaltyPoints,
    totalSpent: patch.totalSpent ?? current.totalSpent,
    orderCount: patch.orderCount ?? current.orderCount,
    lastOrderAt:
      patch.lastOrderAt === undefined ? current.lastOrderAt : patch.lastOrderAt,
    deletedAt:
      patch.deletedAt === undefined ? current.deletedAt : patch.deletedAt,
    updatedAt: nowISO(),
  };
  const nextState = appendAudit(
    {
      ...state,
      customers: state.customers.map((customer) =>
        customer.id === id ? updated : customer,
      ),
    },
    {
      userId: null,
      action: "customer.update",
      entityType: "customer",
      entityId: id,
      oldValues: { name: current.name, phone: current.phone },
      newValues: { name: updated.name, phone: updated.phone },
    },
  );
  setState(nextState);
  queueStoreSync("update_customer", { customer: updated });
  return updated;
}

export function deleteCustomer(id: string): boolean {
  return updateCustomer(id, { deletedAt: nowISO() }) !== null;
}

// ─── Orders CRUD ─────────────────────────────────────────────────────────────

export function getOrders(): Order[] {
  return getState().orders.filter((o) => !o.deletedAt);
}

export function getOrderById(id: string): Order | undefined {
  return getOrders().find((o) => o.id === id);
}

export function createOrder(input: CreateOrderInput): Order {
  const state = getState();
  if (input.items.length === 0) {
    throw new Error("لا يمكن إنشاء طلب فارغ");
  }
  if (
    input.customerId &&
    !state.customers.some(
      (customer) => customer.id === input.customerId && !customer.deletedAt,
    )
  ) {
    throw new Error("العميل المحدد غير موجود");
  }

  const requestedByProduct = new Map<string, number>();
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error("كمية المنتج يجب أن تكون أكبر من صفر");
    }
    requestedByProduct.set(
      item.productId,
      (requestedByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  for (const [productId, quantity] of requestedByProduct) {
    const product = state.products.find(
      (candidate) =>
        candidate.id === productId &&
        candidate.isActive &&
        !candidate.deletedAt,
    );
    if (!product) {
      throw new Error(`المنتج غير متاح: ${productId}`);
    }
    if (product.trackStock === false) continue;
    const available = getAvailableStock(
      state.batches,
      state.orders,
      productId,
    );
    if (quantity > available) {
      throw new Error(
        `الكمية المتاحة من ${product.nameAr} هي ${available} فقط بعد حجوزات الطلبات`,
      );
    }
  }

  const orderId = generateId();
  const customer = input.customerId
    ? state.customers.find((c) => c.id === input.customerId)
    : null;

  const items: OrderItem[] = input.items.map((item) => {
    const product = state.products.find((p) => p.id === item.productId);
    if (!product) {
      throw new Error(`المنتج غير موجود: ${item.productId}`);
    }
    const unitPrice =
      item.unitPrice ??
      resolveUnitPrice(
        product.retailPrice,
        product.wholesalePrice,
        customer?.wholesalePricing ?? false,
      );
    const discount = item.discount ?? 0;
    return {
      id: generateId(),
      orderId,
      productId: product.id,
      variantId: null,
      batchId: null,
      productNameAr: product.nameAr,
      quantity: item.quantity,
      unitPrice,
      discount,
      total: calculateLineTotal({ quantity: item.quantity, unitPrice, discount }),
      weightGrams: product.weightGrams,
      notes: item.notes ?? null,
    };
  });

  const totals = calculateOrderTotals({
    items: items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
    })),
    discountAmount: input.discountAmount ?? 0,
    taxRate: state.settings.taxRate,
  });

  if (input.couponCode) {
    const coupon = validateCoupon(input.couponCode, totals.subtotal);
    if (!coupon) {
      throw new Error("كود الكوبون غير صالح أو منتهي");
    }
  }

  const order: Order = {
    id: orderId,
    branchId: input.branchId,
    orderNumber: nextOrderNumber(state),
    customerId: input.customerId ?? null,
    type: input.type,
    status: "received",
    items,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    total: totals.total,
    paidAmount: 0,
    paymentStatus: "unpaid",
    deliveryDate: input.deliveryDate ?? null,
    deliveryTime: input.deliveryTime ?? null,
    deliveryAddress: input.deliveryAddress ?? null,
    notes: input.notes ?? null,
    assignedTo: input.assignedTo ?? null,
    shiftId: input.shiftId ?? null,
    createdBy: input.createdBy ?? null,
    couponCode: input.couponCode ?? null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    deletedAt: null,
  };

  let newState: AppState = {
    ...state,
    orders: [...state.orders, order],
    orderStatusHistory: [
      ...state.orderStatusHistory,
      {
        id: generateId(),
        orderId,
        fromStatus: null,
        toStatus: "received",
        changedBy: input.createdBy ?? null,
        changedAt: nowISO(),
        notes: "إنشاء طلب جديد",
      },
    ],
  };

  if (input.event) {
    const event: Event = {
      id: generateId(),
      orderId,
      ...input.event,
      createdAt: nowISO(),
    };
    newState = { ...newState, events: [...newState.events, event] };
  }

  if (input.couponCode) {
    const coupon = validateCoupon(input.couponCode, totals.subtotal);
    if (coupon) {
      newState = {
        ...newState,
        coupons: newState.coupons.map((c) =>
          c.id === coupon.id
            ? { ...c, usedCount: c.usedCount + 1, updatedAt: nowISO() }
            : c,
        ),
      };
    }
  }

  newState = appendAudit(newState, {
    userId: input.createdBy ?? null,
    action: "order.create",
    entityType: "order",
    entityId: orderId,
    oldValues: null,
    newValues: { orderNumber: order.orderNumber, total: order.total },
  });

  newState = pushNotificationToState(newState, {
    userId: "system",
    type: "order",
    title: "طلب جديد",
    body: `${order.orderNumber} — ${formatMoneyLabel(order.total, newState.settings)}`,
    link: `/orders`,
    channels: ["in_app"],
  });

  if (order.deliveryDate) {
    newState = pushNotificationToState(newState, {
      userId: "system",
      type: "event",
      title: "تذكير تسليم",
      body: `${order.orderNumber} مجدول في ${order.deliveryDate}${order.deliveryTime ? ` ${order.deliveryTime}` : ""}`,
      link: `/calendar`,
      channels: ["in_app"],
    });
  }

  setState(newState);
  queueStoreSync("create_order", {
    order,
    event: newState.events.find((event) => event.orderId === order.id) ?? null,
  });
  return order;
}

export function getEventByOrderId(orderId: string): Event | undefined {
  return getState().events.find((event) => event.orderId === orderId);
}

export function updateEventBooking(input: {
  orderId: string;
  eventType?: Event["eventType"];
  guestCount?: number;
  packagingColors?: string[];
  giftCardMessage?: string | null;
  giftCardPhrase?: string | null;
  specialNotes?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
}): { order: Order; event: Event } | null {
  const state = getState();
  const order = state.orders.find(
    (candidate) => candidate.id === input.orderId && !candidate.deletedAt,
  );
  const event = state.events.find(
    (candidate) => candidate.orderId === input.orderId,
  );
  if (!order || !event) return null;

  const updatedOrder: Order = {
    ...order,
    deliveryDate:
      input.deliveryDate !== undefined
        ? input.deliveryDate
        : order.deliveryDate,
    deliveryTime:
      input.deliveryTime !== undefined
        ? input.deliveryTime
        : order.deliveryTime,
    deliveryAddress:
      input.deliveryAddress !== undefined
        ? input.deliveryAddress
        : order.deliveryAddress,
    notes: input.notes !== undefined ? input.notes : order.notes,
    updatedAt: nowISO(),
  };

  const updatedEvent: Event = {
    ...event,
    eventType: input.eventType ?? event.eventType,
    guestCount: input.guestCount ?? event.guestCount,
    packagingColors: input.packagingColors ?? event.packagingColors,
    giftCardMessage:
      input.giftCardMessage !== undefined
        ? input.giftCardMessage
        : event.giftCardMessage,
    giftCardPhrase:
      input.giftCardPhrase !== undefined
        ? input.giftCardPhrase
        : event.giftCardPhrase,
    specialNotes:
      input.specialNotes !== undefined
        ? input.specialNotes
        : event.specialNotes,
  };

  let nextState: AppState = {
    ...state,
    orders: state.orders.map((candidate) =>
      candidate.id === order.id ? updatedOrder : candidate,
    ),
    events: state.events.map((candidate) =>
      candidate.id === event.id ? updatedEvent : candidate,
    ),
  };

  nextState = pushNotificationToState(nextState, {
    userId: "system",
    type: "event",
    title: "تحديث مناسبة",
    body: `تم تعديل ${updatedOrder.orderNumber} — ${updatedOrder.deliveryDate ?? "بدون موعد"}`,
    link: "/events",
    channels: ["in_app"],
  });

  setState(nextState);
  queueStoreSync("update_event_booking", {
    order: updatedOrder,
    event: updatedEvent,
  });
  return { order: updatedOrder, event: updatedEvent };
}

export function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  changedBy?: string | null,
  notes?: string | null,
): Order | null {
  const state = getState();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return null;

  if (!isValidStatusTransition(order.status, newStatus)) {
    throw new Error(
      `انتقال حالة غير صالح: ${order.status} → ${newStatus}`,
    );
  }
  if (newStatus === "completed" && order.paymentStatus !== "paid") {
    const balance = roundMoney(order.total - order.paidAmount);
    throw new Error(
      `يجب تسوية الرصيد المتبقي (${formatMoneyLabel(balance, state.settings)}) قبل إكمال الطلب`,
    );
  }

  let newState: AppState = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? { ...o, status: newStatus, updatedAt: nowISO() }
        : o,
    ),
    orderStatusHistory: [
      ...state.orderStatusHistory,
      {
        id: generateId(),
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        changedBy: changedBy ?? null,
        changedAt: nowISO(),
        notes: notes ?? null,
      },
    ],
  };

  if (newStatus === "completed") {
    newState = completeOrder(newState, orderId, changedBy);
  }

  newState = appendAudit(newState, {
    userId: changedBy ?? null,
    action: "order.update_status",
    entityType: "order",
    entityId: orderId,
    oldValues: { status: order.status },
    newValues: { status: newStatus },
  });

  setState(newState);
  const updatedOrder =
    newState.orders.find((candidate) => candidate.id === orderId) ?? null;
  if (updatedOrder) {
    queueStoreSync("update_status", {
      orderId,
      branchId: updatedOrder.branchId,
      status: updatedOrder.status,
      updatedAt: updatedOrder.updatedAt,
      changedBy: changedBy ?? null,
    });
  }
  return updatedOrder;
}

function completeOrder(
  state: AppState,
  orderId: string,
  userId?: string | null,
): AppState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return state;

  let newState = deductInventoryForOrder(state, order, userId);

  if (order.customerId) {
    const customer = newState.customers.find((c) => c.id === order.customerId);
    if (customer) {
      const earnResult = earnPoints({
        customer,
        orderTotal: order.total,
        pointsPerSar: newState.settings.loyaltyPointsPerSar,
        orderId,
      });

      newState = {
        ...newState,
        customers: newState.customers.map((c) =>
          c.id === customer.id ? earnResult.customer : c,
        ),
        loyaltyPointsLog: [...newState.loyaltyPointsLog, earnResult.log],
      };
    }
  }

  if (order.customerId) {
    newState = {
      ...newState,
      customers: newState.customers.map((c) =>
        c.id === order.customerId
          ? {
              ...c,
              totalSpent: c.totalSpent + order.total,
              orderCount: c.orderCount + 1,
              lastOrderAt: nowISO(),
              updatedAt: nowISO(),
            }
          : c,
      ),
    };
  }

  return newState;
}

function deductInventoryForOrder(
  state: AppState,
  order: Order,
  userId?: string | null,
): AppState {
  let batches = [...state.batches];
  const movements = [...state.inventoryMovements];
  const updatedItems = [...order.items];

  for (let i = 0; i < updatedItems.length; i++) {
    const item = updatedItems[i];
    const product = state.products.find((p) => p.id === item.productId);
    if (product && product.trackStock === false) continue;

    const { updatedBatches, result } = fefoDeduct(batches, {
      productId: item.productId,
      quantity: item.quantity,
      branchId: order.branchId,
      referenceType: "order",
      referenceId: order.id,
      createdBy: userId,
    });

    batches = updatedBatches;
    movements.push(...result.movements);

    if (result.allocations.length > 0) {
      updatedItems[i] = {
        ...item,
        batchId: result.allocations[0].batchId,
      };
    }

    if (result.remainingQuantity > 0) {
      throw new Error(
        `مخزون غير كافٍ للمنتج ${item.productNameAr}: نقص ${result.remainingQuantity}`,
      );
    }
  }

  const orders = state.orders.map((o) =>
    o.id === order.id ? { ...o, items: updatedItems } : o,
  );

  const nextState = { ...state, batches, inventoryMovements: movements, orders };
  if (isBrowser() && batches.length > 0) {
    const changedBatches = batches.filter((batch) => {
      const previous = state.batches.find((item) => item.id === batch.id);
      return !previous || previous.quantity !== batch.quantity;
    });
    if (changedBatches.length > 0) {
      queueStoreSync("update_batches", {
        batches: changedBatches,
        branchId: order.branchId,
      });
      queueStoreSync("sync_order_items", {
        orderId: order.id,
        branchId: order.branchId,
        items: updatedItems,
      });
      const newMovements = movements.slice(state.inventoryMovements.length);
      queueMovementsSync(newMovements);
    }
  }

  return nextState;
}

export function deleteOrder(id: string): boolean {
  const result = update((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === id ? { ...o, deletedAt: nowISO(), updatedAt: nowISO() } : o,
    ),
  }));
  return result.orders.some((o) => o.id === id && o.deletedAt !== null);
}

// ─── Payments ──────────────────────────────────────────────────────────────────

export function processPayment(input: ProcessPaymentInput): Payment {
  const state = getState();
  const order = state.orders.find((o) => o.id === input.orderId);
  if (!order) throw new Error("الطلب غير موجود");

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("مبلغ الدفع يجب أن يكون أكبر من صفر");
  }

  const remaining = roundMoney(order.total - order.paidAmount);
  if (remaining <= 0) {
    throw new Error("تم سداد الطلب بالكامل مسبقاً");
  }
  if (input.amount > remaining) {
    throw new Error(
      `مبلغ الدفع أكبر من المتبقي (${formatMoneyLabel(remaining, state.settings)})`,
    );
  }

  const cashAmount = input.cashAmount ?? 0;
  const cardAmount = input.cardAmount ?? 0;
  if (cashAmount < 0 || cardAmount < 0) {
    throw new Error("مبالغ الدفع لا يمكن أن تكون سالبة");
  }
  if (
    input.method === "cash" &&
    Math.abs(cashAmount - input.amount) > 0.01
  ) {
    throw new Error("المبلغ النقدي لا يساوي مبلغ الدفع");
  }
  if (
    input.method === "card" &&
    Math.abs(cardAmount - input.amount) > 0.01
  ) {
    throw new Error("مبلغ البطاقة لا يساوي مبلغ الدفع");
  }
  if (
    input.method === "mixed" &&
    Math.abs(cashAmount + cardAmount - input.amount) > 0.01
  ) {
    throw new Error("مجموع النقد والبطاقة لا يساوي مبلغ الدفع");
  }

  const payment: Payment = {
    id: generateId(),
    orderId: input.orderId,
    shiftId: input.shiftId ?? order.shiftId ?? null,
    method: input.method,
    amount: input.amount,
    cashAmount: input.cashAmount ?? null,
    cardAmount: input.cardAmount ?? null,
    reference: input.reference ?? null,
    createdAt: nowISO(),
  };

  const paidAmount = roundMoney(order.paidAmount + input.amount);
  const paymentStatus = resolvePaymentStatus(paidAmount, order.total);

  let newState: AppState = {
    ...state,
    payments: [...state.payments, payment],
    orders: state.orders.map((o) =>
      o.id === input.orderId
        ? {
            ...o,
            paidAmount,
            paymentStatus,
            updatedAt: nowISO(),
          }
        : o,
    ),
  };

  const cashContribution =
    input.method === "cash" || input.method === "mixed"
      ? payment.cashAmount ?? 0
      : 0;
  if (payment.shiftId && cashContribution > 0) {
    newState = {
      ...newState,
      shifts: newState.shifts.map((shift) =>
        shift.id === payment.shiftId && shift.status === "open"
          ? {
              ...shift,
              expectedCash: roundMoney(
                shift.expectedCash + cashContribution,
              ),
              updatedAt: nowISO(),
            }
          : shift,
      ),
    };
  }

  if (paymentStatus === "paid") {
    const invoice: Invoice = {
      id: generateId(),
      orderId: input.orderId,
      invoiceNumber: nextInvoiceNumber(state),
      qrPayload: null,
      printedAt: null,
      createdAt: nowISO(),
    };
    newState = {
      ...newState,
      invoices: [...newState.invoices, invoice],
    };
    queueStoreSync("create_invoice", {
      invoice,
      branchId: state.settings.branchId,
    });
  }

  if (paymentStatus === "paid" && order.type === "pos") {
    newState = {
      ...newState,
      orders: newState.orders.map((o) =>
        o.id === order.id
          ? { ...o, status: "completed", updatedAt: nowISO() }
          : o,
      ),
      orderStatusHistory: [
        ...newState.orderStatusHistory,
        {
          id: generateId(),
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "completed",
          changedBy: input.userId ?? null,
          changedAt: nowISO(),
          notes: "إتمام بيع نقطة الدفع",
        },
      ],
    };
    newState = completeOrder(newState, order.id, input.userId);
  }

  newState = appendAudit(newState, {
    userId: input.userId ?? null,
    action: "payment.process",
    entityType: "payment",
    entityId: payment.id,
    oldValues: { paidAmount: order.paidAmount },
    newValues: { paidAmount, method: input.method },
  });

  const methodLabels: Record<string, string> = {
    cash: "نقدي",
    card: "بطاقة",
    transfer: "تحويل",
    mixed: "مختلط",
    credit: "آجل",
  };
  newState = pushNotificationToState(newState, {
    userId: input.userId ?? "system",
    type: "order",
    title: "تم تحصيل دفعة",
    body: `${order.orderNumber} — ${formatMoneyLabel(input.amount, newState.settings)} (${methodLabels[input.method] ?? input.method})`,
    link: `/orders`,
    channels: ["in_app"],
  });

  setState(newState);
  queueStoreSync("process_payment", {
    payment,
    branchId: order.branchId,
    createdBy: input.userId ?? null,
  });
  if (paymentStatus === "paid" && order.type === "pos") {
    const completed = newState.orders.find((o) => o.id === order.id);
    if (completed) {
      queueStoreSync("update_status", {
        orderId: completed.id,
        branchId: completed.branchId,
        status: completed.status,
        updatedAt: completed.updatedAt,
        changedBy: input.userId ?? null,
      });
    }
  }
  return payment;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export function getBatches(): Batch[] {
  return getState().batches;
}

export function getBatchesByProduct(productId: string): Batch[] {
  return getBatches().filter((b) => b.productId === productId);
}

export interface ReceiveInventoryBatchInput {
  branchId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  costPerUnit: number;
  createdBy?: string | null;
  notes?: string | null;
}

export function receiveInventoryBatch(
  input: ReceiveInventoryBatchInput,
): Batch {
  const state = getState();
  const product = state.products.find(
    (candidate) =>
      candidate.id === input.productId &&
      candidate.branchId === input.branchId &&
      !candidate.deletedAt,
  );
  if (!product) throw new Error("الصنف المحدد غير موجود");

  const batchNumber = input.batchNumber.trim().toUpperCase();
  if (!batchNumber) throw new Error("رقم الدفعة مطلوب");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("كمية الدفعة يجب أن تكون أكبر من صفر");
  }
  if (!Number.isFinite(input.costPerUnit) || input.costPerUnit < 0) {
    throw new Error("تكلفة الوحدة غير صالحة");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiryDate)) {
    throw new Error("تاريخ الصلاحية غير صالح");
  }
  if (input.expiryDate < new Date().toISOString().slice(0, 10)) {
    throw new Error("لا يمكن استلام دفعة منتهية الصلاحية");
  }
  if (
    state.batches.some(
      (batch) =>
        batch.productId === input.productId &&
        batch.batchNumber.toUpperCase() === batchNumber,
    )
  ) {
    throw new Error("رقم الدفعة مستخدم مسبقاً لهذا الصنف");
  }

  const timestamp = nowISO();
  const batch: Batch = {
    id: generateId(),
    productId: input.productId,
    branchId: input.branchId,
    batchNumber,
    quantity: Math.round(input.quantity * 1000) / 1000,
    expiryDate: input.expiryDate,
    costPerUnit: roundMoney(input.costPerUnit),
    receivedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const movement = addMovement({
    branchId: input.branchId,
    productId: input.productId,
    batchId: batch.id,
    type: "add",
    quantity: batch.quantity,
    referenceType: "opening_stock",
    referenceId: batch.id,
    notes: input.notes?.trim() || `رصيد افتتاحي — دفعة ${batchNumber}`,
    createdBy: input.createdBy ?? null,
  });
  const nextState = appendAudit(
    {
      ...state,
      batches: [...state.batches, batch],
      inventoryMovements: [...state.inventoryMovements, movement],
    },
    {
      userId: input.createdBy ?? null,
      action: "inventory.receive",
      entityType: "batch",
      entityId: batch.id,
      oldValues: null,
      newValues: {
        productId: product.id,
        batchNumber,
        quantity: batch.quantity,
        expiryDate: batch.expiryDate,
      },
    },
  );
  setState(nextState);
  queueStoreSync("receive_inventory", { batch, movement });
  return batch;
}

export function deductInventory(
  productId: string,
  quantity: number,
  branchId: string,
  referenceType: string,
  referenceId: string,
  createdBy?: string | null,
): void {
  let syncedMovements: InventoryMovement[] = [];
  update((s) => {
    const { updatedBatches, result } = fefoDeduct(s.batches, {
      productId,
      quantity,
      branchId,
      referenceType,
      referenceId,
      createdBy,
    });

    if (result.remainingQuantity > 0) {
      throw new Error(`مخزون غير كافٍ — نقص ${result.remainingQuantity}`);
    }

    syncedMovements = result.movements;
    return {
      ...s,
      batches: updatedBatches,
      inventoryMovements: [...s.inventoryMovements, ...result.movements],
    };
  });
  queueMovementsSync(syncedMovements);
}

// ─── Suppliers CRUD ────────────────────────────────────────────────────────────

export function getSuppliers(): Supplier[] {
  return getState().suppliers.filter((s) => !s.deletedAt);
}

export function createSupplier(
  data: Omit<Supplier, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Supplier {
  const supplier: Supplier = {
    ...data,
    id: generateId(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    deletedAt: null,
  };
  update((s) => ({ ...s, suppliers: [...s.suppliers, supplier] }));
  queueStoreSync("create_supplier", { supplier });
  return supplier;
}

// ─── Expenses CRUD ───────────────────────────────────────────────────────────

export function getExpenses(): Expense[] {
  return getState().expenses;
}

export function createExpense(
  data: Omit<Expense, "id" | "createdAt" | "updatedAt">,
): Expense {
  const expense: Expense = {
    ...data,
    id: generateId(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  update((s) => ({ ...s, expenses: [...s.expenses, expense] }));
  queueStoreSync("create_expense", { expense });
  return expense;
}

// ─── Shifts ──────────────────────────────────────────────────────────────────

export function getShifts(): Shift[] {
  return getState().shifts;
}

export function getOpenShift(branchId: string): Shift | undefined {
  return getShifts().find((s) => s.branchId === branchId && s.status === "open");
}

export function openShift(
  branchId: string,
  cashierId: string,
  openingFloat: number,
): Shift {
  const existing = getOpenShift(branchId);
  if (existing) throw new Error("يوجد وردية مفتوحة بالفعل");

  const shift: Shift = {
    id: generateId(),
    branchId,
    cashierId,
    openedAt: nowISO(),
    closedAt: null,
    openingFloat,
    closingCount: null,
    expectedCash: openingFloat,
    variance: null,
    status: "open",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  update((s) => ({ ...s, shifts: [...s.shifts, shift] }));
  queueStoreSync("open_shift", { shift });
  return shift;
}

export function closeShift(
  shiftId: string,
  closingCount: number,
): Shift | null {
  let updated: Shift | null = null;
  update((s) => {
    const shifts = s.shifts.map((sh) => {
      if (sh.id !== shiftId) return sh;
      const cashPayments = s.payments
        .filter((p) => {
          const order = s.orders.find((o) => o.id === p.orderId);
          return (
            (p.shiftId ?? order?.shiftId) === shiftId &&
            (p.method === "cash" || p.method === "mixed")
          );
        })
        .reduce((sum, p) => sum + (p.cashAmount ?? p.amount), 0);
      const expectedCash = sh.openingFloat + cashPayments;
      updated = {
        ...sh,
        closedAt: nowISO(),
        closingCount,
        expectedCash,
        variance: closingCount - expectedCash,
        status: "closed",
        updatedAt: nowISO(),
      };
      return updated;
    });
    return updated ? { ...s, shifts } : s;
  });
  if (updated) {
    queueStoreSync("close_shift", { shift: updated });
  }
  return updated;
}

// ─── Discounts & Coupons ─────────────────────────────────────────────────────

export function getDiscounts(): Discount[] {
  return getState().discounts.filter((d) => !d.deletedAt);
}

export function getCoupons(): Coupon[] {
  return getState().coupons.filter((c) => !c.deletedAt);
}

export function validateCoupon(code: string, cartTotal: number): Coupon | null {
  const coupon = getCoupons().find(
    (c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive,
  );
  if (!coupon) return null;
  if (coupon.usedCount >= coupon.maxUses) return null;
  if (cartTotal < coupon.minCartAmount) return null;
  if (coupon.startDate && new Date(coupon.startDate) > new Date()) return null;
  if (coupon.endDate && new Date(coupon.endDate) < new Date()) return null;
  return coupon;
}

export function createDiscount(
  data: Omit<Discount, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Discount {
  const discount: Discount = {
    ...data,
    id: generateId(),
    deletedAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  update((s) => ({ ...s, discounts: [...s.discounts, discount] }));
  queueStoreSync("create_discount", { discount });
  return discount;
}

export function createCoupon(
  data: Omit<
    Coupon,
    "id" | "createdAt" | "updatedAt" | "deletedAt" | "usedCount"
  >,
): Coupon {
  const coupon: Coupon = {
    ...data,
    id: generateId(),
    usedCount: 0,
    deletedAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  update((s) => ({ ...s, coupons: [...s.coupons, coupon] }));
  queueStoreSync("create_coupon", { coupon });
  return coupon;
}

export function redeemLoyaltyDiscount(
  customerId: string,
  points: number,
): { discountAmount: number; customer: Customer } {
  const state = getState();
  const customer = state.customers.find(
    (c) => c.id === customerId && !c.deletedAt,
  );
  if (!customer) throw new Error("العميل غير موجود");

  const result = redeemPoints({
    customer,
    points,
    notes: "استبدال نقاط في نقطة البيع",
  });
  const redeemed = customer.loyaltyPoints - result.customer.loyaltyPoints;
  const discountAmount = roundMoney(
    redeemed * state.settings.loyaltyRedeemRate,
  );

  update((s) => ({
    ...s,
    customers: s.customers.map((c) =>
      c.id === customer.id ? result.customer : c,
    ),
    loyaltyPointsLog: [...s.loyaltyPointsLog, result.log],
  }));

  return { discountAmount, customer: result.customer };
}

// ─── Returns ─────────────────────────────────────────────────────────────────

export function getReturns(): Return[] {
  return getState().returns;
}

export function createReturn(input: CreateReturnInput): Return {
  const state = getState();
  const order = state.orders.find(
    (o) => o.id === input.orderId && !o.deletedAt,
  );
  if (!order) throw new Error("الطلب غير موجود");
  if (order.paymentStatus === "unpaid") {
    throw new Error("لا يمكن إرجاع طلب غير مدفوع");
  }

  const returnItems: ReturnItem[] = [];
  let totalRefund = 0;
  let batches = [...state.batches];
  const movements = [...state.inventoryMovements];

  for (const item of input.items) {
    const orderItem = order.items.find((oi) => oi.id === item.orderItemId);
    if (!orderItem) throw new Error("بند الطلب غير موجود");
    if (item.quantity <= 0 || item.quantity > orderItem.quantity) {
      throw new Error(`كمية الإرجاع غير صالحة لـ ${orderItem.productNameAr}`);
    }

    const unitRefund = roundMoney(
      orderItem.total / Math.max(orderItem.quantity, 1),
    );
    const refundAmount = roundMoney(unitRefund * item.quantity);
    totalRefund += refundAmount;

    returnItems.push({
      id: generateId(),
      returnId: "",
      orderItemId: item.orderItemId,
      productId: item.productId,
      quantity: item.quantity,
      restock: item.restock,
      refundAmount,
    });

    if (item.restock) {
      const product = state.products.find((p) => p.id === item.productId);
      if (product?.trackStock !== false) {
        const existingBatch = batches.find(
          (b) =>
            b.productId === item.productId && b.branchId === input.branchId,
        );
        if (existingBatch) {
          batches = batches.map((b) =>
            b.id === existingBatch.id
              ? {
                  ...b,
                  quantity: b.quantity + item.quantity,
                  updatedAt: nowISO(),
                }
              : b,
          );
          movements.push(
            addMovement({
              branchId: input.branchId,
              productId: item.productId,
              batchId: existingBatch.id,
              type: "return",
              quantity: item.quantity,
              referenceType: "return",
              referenceId: null,
              notes: `إرجاع ${order.orderNumber}`,
              createdBy: input.createdBy,
            }),
          );
        }
      }
    }
  }

  const returnRecord: Return = {
    id: generateId(),
    branchId: input.branchId,
    orderId: input.orderId,
    returnNumber: nextReturnNumber(state),
    items: returnItems.map((ri) => ({ ...ri, returnId: "" })),
    refundMethod: input.refundMethod,
    totalRefund: roundMoney(totalRefund),
    notes: input.notes ?? null,
    createdBy: input.createdBy ?? null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  returnRecord.items = returnRecord.items.map((ri) => ({
    ...ri,
    returnId: returnRecord.id,
  }));

  let newState: AppState = {
    ...state,
    returns: [...state.returns, returnRecord],
    batches,
    inventoryMovements: movements,
  };

  if (input.refundMethod === "cash" && input.shiftId) {
    newState = {
      ...newState,
      shifts: newState.shifts.map((shift) =>
        shift.id === input.shiftId && shift.status === "open"
          ? {
              ...shift,
              expectedCash: roundMoney(
                Math.max(0, shift.expectedCash - totalRefund),
              ),
              updatedAt: nowISO(),
            }
          : shift,
      ),
    };
  }

  if (input.refundMethod === "credit" && order.customerId) {
    newState = {
      ...newState,
      customers: newState.customers.map((c) =>
        c.id === order.customerId
          ? {
              ...c,
              totalSpent: Math.max(0, c.totalSpent - totalRefund),
              updatedAt: nowISO(),
            }
          : c,
      ),
    };
  }

  newState = appendAudit(newState, {
    userId: input.createdBy ?? null,
    action: "return.create",
    entityType: "return",
    entityId: returnRecord.id,
    oldValues: null,
    newValues: {
      returnNumber: returnRecord.returnNumber,
      totalRefund,
    },
  });

  setState(newState);
  if (batches.length > 0) {
    queueStoreSync("update_batches", {
      batches,
      branchId: input.branchId,
    });
  }
  const newMovements = movements.slice(state.inventoryMovements.length);
  queueMovementsSync(newMovements);
  queueStoreSync("create_return", { returnRecord });
  return returnRecord;
}

// ─── Purchase Orders ─────────────────────────────────────────────────────────

export function getPurchaseOrders(): PurchaseOrder[] {
  return getState().purchaseOrders;
}

export function createPurchaseOrder(
  data: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt" | "poNumber">,
): PurchaseOrder {
  const state = getState();
  const po: PurchaseOrder = {
    ...data,
    id: generateId(),
    poNumber: `PO-${new Date().getFullYear()}-${String(state.purchaseOrders.length + 1).padStart(4, "0")}`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  update((s) => ({
    ...s,
    purchaseOrders: [...s.purchaseOrders, po],
  }));
  queueStoreSync("create_purchase_order", { purchaseOrder: po });
  return po;
}

export function receivePurchaseOrder(
  purchaseOrderId: string,
  receivedItems: Array<{
    itemId: string;
    quantity: number;
    batchNumber: string;
    expiryDate: string;
    costPerUnit: number;
  }>,
  receivedBy?: string | null,
): PurchaseOrder | null {
  const state = getState();
  const po = state.purchaseOrders.find((p) => p.id === purchaseOrderId);
  if (!po) return null;

  let batches = [...state.batches];
  const movements = [...state.inventoryMovements];

  for (const received of receivedItems) {
    const line = po.items.find((item) => item.id === received.itemId);
    if (!line || received.quantity <= 0) continue;

    const batch: Batch = {
      id: generateId(),
      productId: line.productId,
      branchId: po.branchId,
      batchNumber: received.batchNumber.trim().toUpperCase(),
      quantity: received.quantity,
      expiryDate: received.expiryDate,
      costPerUnit: received.costPerUnit,
      receivedAt: nowISO(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    batches.push(batch);
    movements.push(
      addMovement({
        branchId: po.branchId,
        productId: line.productId,
        batchId: batch.id,
        type: "add",
        quantity: received.quantity,
        referenceType: "purchase_order",
        referenceId: po.id,
        notes: `استلام ${po.poNumber}`,
        createdBy: receivedBy,
      }),
    );
    queueStoreSync("receive_inventory", { batch });
  }

  const updatedItems = po.items.map((item) => {
    const received = receivedItems.find((r) => r.itemId === item.id);
    if (!received) return item;
    return {
      ...item,
      receivedQuantity: item.receivedQuantity + received.quantity,
    };
  });

  const allReceived = updatedItems.every(
    (item) => item.receivedQuantity >= item.quantity,
  );
  const anyReceived = updatedItems.some((item) => item.receivedQuantity > 0);

  const updated: PurchaseOrder = {
    ...po,
    items: updatedItems,
    status: allReceived
      ? "received"
      : anyReceived
        ? "partial"
        : po.status,
    receivedAt: allReceived ? nowISO() : po.receivedAt,
    updatedAt: nowISO(),
  };

  setState({
    ...state,
    batches,
    inventoryMovements: movements,
    purchaseOrders: state.purchaseOrders.map((p) =>
      p.id === po.id ? updated : p,
    ),
  });

  queueStoreSync("update_purchase_order", { purchaseOrder: updated });
  const newMovements = movements.slice(state.inventoryMovements.length);
  queueMovementsSync(newMovements);

  return updated;
}

export function printInvoice(invoiceId: string): Invoice | null {
  const state = getState();
  const invoice = state.invoices.find((item) => item.id === invoiceId);
  if (!invoice) return null;
  const order = state.orders.find((item) => item.id === invoice.orderId);
  if (!order) return null;

  const updated: Invoice = {
    ...invoice,
    qrPayload: buildInvoiceQrPayload({ invoice, order, settings: state.settings }),
    printedAt: nowISO(),
  };

  update((s) => ({
    ...s,
    invoices: s.invoices.map((item) =>
      item.id === invoiceId ? updated : item,
    ),
  }));
  queueStoreSync("update_invoice", {
    invoice: updated,
    branchId: state.settings.branchId,
  });
  return updated;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export function getUsers(): UserProfile[] {
  return getState().users.filter((u) => u.isActive);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSettings() {
  return getState().settings;
}

export function updateSettings(
  patch: Partial<AppState["settings"]>,
): AppState["settings"] {
  let updated = getSettings();
  update((s) => {
    updated = { ...s.settings, ...patch };
    return { ...s, settings: updated };
  });
  queueStoreSync("sync_settings", { settings: updated });
  return updated;
}

// ─── Notifications ───────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS = 200;

function pushNotificationToState(
  state: AppState,
  input: Omit<Notification, "id" | "createdAt" | "readAt">,
): AppState {
  const notification: Notification = {
    ...input,
    id: generateId(),
    readAt: null,
    createdAt: nowISO(),
  };
  return {
    ...state,
    notifications: [notification, ...state.notifications].slice(
      0,
      MAX_NOTIFICATIONS,
    ),
  };
}

export function pushNotification(
  input: Omit<Notification, "id" | "createdAt" | "readAt">,
): Notification {
  let created!: Notification;
  update((state) => {
    const next = pushNotificationToState(state, input);
    created = next.notifications[0]!;
    return next;
  });
  return created;
}

export function getNotifications(): Notification[] {
  return [...getState().notifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function markNotificationRead(id: string): void {
  update((state) => ({
    ...state,
    notifications: state.notifications.map((n) =>
      n.id === id && !n.readAt
        ? { ...n, readAt: nowISO() }
        : n,
    ),
  }));
}

export function markAllNotificationsRead(): void {
  const readAt = nowISO();
  update((state) => ({
    ...state,
    notifications: state.notifications.map((n) =>
      n.readAt ? n : { ...n, readAt },
    ),
  }));
}

export function refreshSystemReminders(): void {
  update((state) => {
    let next = state;
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const existingKeys = new Set(
      state.notifications.map((n) => `${n.type}:${n.body}`),
    );

    const reminderOffsets = [
      { key: "7d", label: "بعد 7 أيام", msBefore: 7 * 24 * 60 * 60 * 1000 },
      { key: "3d", label: "بعد 3 أيام", msBefore: 3 * 24 * 60 * 60 * 1000 },
      { key: "1d", label: "غداً", msBefore: 24 * 60 * 60 * 1000 },
      { key: "2h", label: "بعد ساعتين", msBefore: 2 * 60 * 60 * 1000 },
      { key: "30m", label: "بعد 30 دقيقة", msBefore: 30 * 60 * 1000 },
    ] as const;

    for (const product of state.products) {
      if (product.deletedAt || !product.isActive) continue;
      if (product.trackStock === false) continue;
      if (product.stockQuantity > product.minStock) continue;
      const body = `${product.nameAr} — المخزون ${product.stockQuantity} (الحد ${product.minStock})`;
      const key = `stock:${body}`;
      if (existingKeys.has(key)) continue;
      next = pushNotificationToState(next, {
        userId: "system",
        type: "stock",
        title: "مخزون منخفض",
        body,
        link: "/inventory",
        channels: ["in_app"],
      });
      existingKeys.add(key);
    }

    for (const order of state.orders) {
      if (order.deletedAt || !order.deliveryDate) continue;
      if (order.status === "cancelled" || order.status === "completed") continue;

      const timePart = order.deliveryTime ?? "12:00";
      const target = new Date(`${order.deliveryDate}T${timePart}`).getTime();
      if (Number.isNaN(target)) continue;

      for (const offset of reminderOffsets) {
        const reminderAt = target - offset.msBefore;
        if (now < reminderAt || now > target) continue;
        const body = `${order.orderNumber} — تذكير ${offset.label}${order.deliveryTime ? ` (${order.deliveryTime})` : ""}`;
        const key = `reminder:${order.id}:${offset.key}`;
        if (existingKeys.has(key)) continue;
        next = pushNotificationToState(next, {
          userId: "system",
          type: "event",
          title: "تذكير موعد",
          body,
          link: "/calendar",
          channels: ["in_app"],
        });
        existingKeys.add(key);
      }

      if (order.deliveryDate !== today) continue;
      const body = `${order.orderNumber} — تسليم اليوم${order.deliveryTime ? ` ${order.deliveryTime}` : ""}`;
      const key = `event:${body}`;
      if (existingKeys.has(key)) continue;
      next = pushNotificationToState(next, {
        userId: "system",
        type: "event",
        title: "تسليم اليوم",
        body,
        link: "/calendar",
        channels: ["in_app"],
      });
      existingKeys.add(key);
    }

    return next === state ? state : next;
  });
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export function getLoyaltyTiers() {
  return getState().loyaltyTiers;
}

export function getLoyaltyPointsLog(customerId?: string) {
  const log = getState().loyaltyPointsLog;
  return customerId ? log.filter((l) => l.customerId === customerId) : log;
}
