// Valentino Chocolate ERP+POS — Core domain types

// ─── Enums & Union Types ─────────────────────────────────────────────────────

/** 8 pipeline stages + cancelled */
export type OrderStatus =
  | "received"
  | "reviewing"
  | "preparing"
  | "packaging"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export type PaymentMethod =
  | "cash"
  | "card"
  | "transfer"
  | "mixed"
  | "credit";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type OrderType =
  | "pos"
  | "delivery"
  | "event"
  | "reservation"
  | "online";

export type EventType =
  | "wedding"
  | "engagement"
  | "birth"
  | "success"
  | "graduation"
  | "birthday"
  | "corporate"
  | "gift"
  | "other";

export type InventoryMovementType =
  | "add"
  | "deduct"
  | "transfer"
  | "waste"
  | "expiry"
  | "sale"
  | "return"
  | "adjust";

export type UnitType = "piece" | "gram" | "kilo" | "box" | "carton";

export type ShiftStatus = "open" | "closed";

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "partial"
  | "received"
  | "cancelled";

export type DiscountType = "percentage" | "fixed";

export type CouponType = "percentage" | "fixed" | "free_shipping";

export type NotificationType = "order" | "stock" | "event" | "system";

export type NotificationChannel =
  | "in_app"
  | "email"
  | "whatsapp"
  | "push"
  | "telegram";

export type LoyaltyAction = "earn" | "redeem" | "adjust";

export type RefundMethod = "cash" | "card" | "credit";

export type RoleKey =
  | "manager"
  | "cashier"
  | "sales"
  | "warehouse"
  | "accountant"
  | "delivery";

// ─── Base ────────────────────────────────────────────────────────────────────

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface SoftDeletable {
  deletedAt: string | null;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface Category extends Timestamps, SoftDeletable {
  id: string;
  branchId: string;
  parentId: string | null;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  sortOrder: number;
}

export interface Product extends Timestamps, SoftDeletable {
  id: string;
  branchId: string;
  categoryId: string;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn: string | null;
  description: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  unitType: UnitType;
  weightGrams: number | null;
  origin: string;
  minStock: number;
  isBundle: boolean;
  isActive: boolean;
  /** When false the product can be sold without batch/stock checks */
  trackStock: boolean;
  stockQuantity: number;
  /** Public HTTPS image URL (ImgBB display_url or similar) */
  imageUrl?: string | null;
}

// ─── CRM ─────────────────────────────────────────────────────────────────────

export interface LoyaltyTier {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  minPoints: number;
  discountPercent: number;
  priority: number;
  color: string;
}

export interface LoyaltyPointsLog {
  id: string;
  customerId: string;
  orderId: string | null;
  action: LoyaltyAction;
  points: number;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
}

export interface Customer extends Timestamps, SoftDeletable {
  id: string;
  branchId: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  notes: string | null;
  birthday: string | null;
  loyaltyTierId: string;
  loyaltyPoints: number;
  totalSpent: number;
  orderCount: number;
  lastOrderAt: string | null;
  wholesalePricing: boolean;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface Batch extends Timestamps {
  id: string;
  productId: string;
  branchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  costPerUnit: number;
  receivedAt: string;
}

export interface InventoryMovement {
  id: string;
  branchId: string;
  productId: string;
  batchId: string | null;
  type: InventoryMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

// ─── Sales ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  batchId: string | null;
  productNameAr: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  weightGrams: number | null;
  notes: string | null;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string | null;
  changedAt: string;
  notes: string | null;
}

export interface Order extends Timestamps, SoftDeletable {
  id: string;
  branchId: string;
  orderNumber: string;
  customerId: string | null;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  deliveryDate: string | null;
  deliveryTime: string | null;
  deliveryAddress: string | null;
  deliveryFee: number;
  deliveryZone: string | null;
  deliveryRecipientName: string | null;
  deliveryPhone: string | null;
  deliveryInstructions: string | null;
  notes: string | null;
  assignedTo: string | null;
  shiftId: string | null;
  createdBy: string | null;
  couponCode: string | null;
}

export interface Event {
  id: string;
  orderId: string;
  eventType: EventType;
  guestCount: number;
  packagingColors: string[];
  giftCardMessage: string | null;
  giftCardPhrase: string | null;
  specialNotes: string | null;
  createdAt: string;
}

export interface Shift extends Timestamps {
  id: string;
  branchId: string;
  cashierId: string;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  closingCount: number | null;
  expectedCash: number;
  variance: number | null;
  status: ShiftStatus;
}

export interface Payment {
  id: string;
  orderId: string;
  shiftId?: string | null;
  method: PaymentMethod;
  amount: number;
  cashAmount: number | null;
  cardAmount: number | null;
  reference: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  qrPayload: string | null;
  printedAt: string | null;
  createdAt: string;
}

// ─── Procurement ───────────────────────────────────────────────────────────────

export interface Supplier extends Timestamps, SoftDeletable {
  id: string;
  branchId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  balance: number;
  isActive: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productNameAr: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  total: number;
}

export interface PurchaseOrder extends Timestamps {
  id: string;
  branchId: string;
  supplierId: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  expectedDate: string | null;
  receivedAt: string | null;
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface Expense extends Timestamps {
  id: string;
  branchId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  createdBy: string | null;
}

export interface ReturnItem {
  id: string;
  returnId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
  restock: boolean;
  refundAmount: number;
}

export interface Return extends Timestamps {
  id: string;
  branchId: string;
  orderId: string;
  returnNumber: string;
  items: ReturnItem[];
  refundMethod: RefundMethod;
  totalRefund: number;
  notes: string | null;
  createdBy: string | null;
}

export interface Discount extends Timestamps, SoftDeletable {
  id: string;
  branchId: string;
  name: string;
  type: DiscountType;
  value: number;
  minCartAmount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface Coupon extends Timestamps, SoftDeletable {
  id: string;
  branchId: string;
  code: string;
  type: CouponType;
  value: number;
  minCartAmount: number;
  maxUses: number;
  usedCount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

// ─── System ──────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  channels: NotificationChannel[];
  createdAt: string;
  /** Stable key so reminders are not duplicated across refreshes */
  dedupKey?: string | null;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  fee: number;
}

export interface Settings {
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  country: string;
  taxRate: number;
  currency: string;
  currencySymbol: string;
  locale: string;
  logoUrl: string | null;
  loyaltyPointsPerSar: number;
  loyaltyRedeemRate: number;
  orderNumberPrefix: string;
  invoiceNumberPrefix: string;
  walkInSalesEnabled: boolean;
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number | null;
  thermalPaperWidth: 58 | 80;
  invoiceFooter: string;
  whatsappCountryCode: string;
  /** Preset delivery zones (Tripoli / Benghazi, etc.) */
  deliveryZones: DeliveryZone[];
  /** After POS sale, prompt WhatsApp share when phone is available */
  autoWhatsAppOnSale: boolean;
  /** Send order/reminder alerts to linked Telegram chats */
  telegramNotificationsEnabled: boolean;
  /** Tax / commercial identifiers for invoice QR */
  taxNumber: string | null;
  commercialRegister: string | null;
  /**
   * Scannable code on PDF invoices / receipts.
   * When false or mode is `hidden`, no QR is rendered.
   */
  documentCodeEnabled: boolean;
  documentCodeMode:
    | "invoice_data"
    | "order_number"
    | "invoice_number"
    | "custom_url"
    | "custom_text"
    | "hidden";
  /** Used when mode is custom_url or custom_text — supports {orderNumber} tokens */
  documentCodeCustomValue: string;
}

export interface UserProfile {
  id: string;
  branchId: string;
  roleKey: RoleKey;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  todaySales: number;
  todaySalesDelta: number | null;
  weekSales: number;
  weekSalesDelta: number | null;
  monthSales: number;
  netProfit: number;
  newOrders: number;
  newCustomers: number;
  ordersByStatus: Record<OrderStatus, number>;
  lowStockProducts: number;
  expiringBatches: number;
  topProducts: Array<{
    productId: string;
    nameAr: string;
    quantitySold: number;
    revenue: number;
  }>;
  recentOrders: Order[];
  urgentAlerts: string[];
  salesByDay: Array<{
    date: string;
    label: string;
    sales: number;
  }>;
}

// ─── App State ───────────────────────────────────────────────────────────────

export interface AppState {
  version: number;
  initializedAt: string;
  settings: Settings;
  products: Product[];
  categories: Category[];
  customers: Customer[];
  orders: Order[];
  events: Event[];
  batches: Batch[];
  inventoryMovements: InventoryMovement[];
  shifts: Shift[];
  payments: Payment[];
  invoices: Invoice[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  returns: Return[];
  discounts: Discount[];
  coupons: Coupon[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  loyaltyTiers: LoyaltyTier[];
  loyaltyPointsLog: LoyaltyPointsLog[];
  users: UserProfile[];
  orderStatusHistory: OrderStatusHistoryEntry[];
}

// ─── Service I/O Types ───────────────────────────────────────────────────────

export interface CreateOrderInput {
  branchId: string;
  customerId?: string | null;
  type: OrderType;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
    notes?: string | null;
  }>;
  discountAmount?: number;
  couponCode?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  deliveryAddress?: string | null;
  deliveryFee?: number;
  deliveryZone?: string | null;
  deliveryRecipientName?: string | null;
  deliveryPhone?: string | null;
  deliveryInstructions?: string | null;
  notes?: string | null;
  assignedTo?: string | null;
  shiftId?: string | null;
  createdBy?: string | null;
  event?: Omit<Event, "id" | "orderId" | "createdAt">;
}

export interface ProcessPaymentInput {
  orderId: string;
  shiftId?: string | null;
  method: PaymentMethod;
  amount: number;
  cashAmount?: number | null;
  cardAmount?: number | null;
  reference?: string | null;
  userId?: string | null;
  loyaltyDiscount?: number;
}

export interface CreateReturnInput {
  branchId: string;
  orderId: string;
  items: Array<{
    orderItemId: string;
    productId: string;
    quantity: number;
    restock: boolean;
  }>;
  refundMethod: RefundMethod;
  notes?: string | null;
  createdBy?: string | null;
  shiftId?: string | null;
}

export interface LineTotalInput {
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface OrderTotalsInput {
  items: LineTotalInput[];
  discountAmount?: number;
  deliveryFee?: number;
  taxRate: number;
}

export interface OrderTotalsResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
}

export interface FefoDeductInput {
  productId: string;
  quantity: number;
  branchId: string;
  referenceType?: string | null;
  referenceId?: string | null;
  createdBy?: string | null;
  movementType?: InventoryMovementType;
}

export interface FefoDeductResult {
  movements: InventoryMovement[];
  allocations: Array<{ batchId: string; quantity: number }>;
  remainingQuantity: number;
}
