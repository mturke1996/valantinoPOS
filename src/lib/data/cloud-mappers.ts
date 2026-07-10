import type {
  Batch,
  Category,
  Customer,
  Event,
  InventoryMovement,
  Order,
  OrderItem,
  Payment,
  Product,
  Shift,
} from "@/types";

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapCategoryRow(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    nameAr: String(row.name_ar ?? ""),
    nameEn: row.name_en ? String(row.name_en) : null,
    slug: String(row.slug ?? ""),
    sortOrder: num(row.sort_order),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapProductRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    categoryId: String(row.category_id),
    sku: String(row.sku ?? ""),
    barcode: String(row.barcode ?? ""),
    nameAr: String(row.name_ar ?? ""),
    nameEn: row.name_en ? String(row.name_en) : null,
    description: String(row.description ?? ""),
    costPrice: num(row.cost_price),
    retailPrice: num(row.retail_price),
    wholesalePrice: num(row.wholesale_price),
    unitType: (row.unit_type as Product["unitType"]) ?? "piece",
    weightGrams: row.weight_grams != null ? num(row.weight_grams) : null,
    origin: String(row.origin ?? ""),
    minStock: num(row.min_stock),
    isBundle: Boolean(row.is_bundle),
    isActive: row.is_active !== false,
    trackStock:
      row.track_stock === undefined
        ? num(row.stock_quantity) > 0
        : Boolean(row.track_stock),
    stockQuantity: num(row.stock_quantity),
    imageUrl: row.image_url ? String(row.image_url) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapBatchRow(row: Record<string, unknown>): Batch {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    branchId: String(row.branch_id),
    batchNumber: String(row.batch_number ?? ""),
    quantity: num(row.quantity),
    expiryDate: String(row.expiry_date ?? "").slice(0, 10),
    costPerUnit: num(row.cost_per_unit),
    receivedAt: String(row.received_at ?? row.created_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapCustomerRow(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    email: row.email ? String(row.email) : null,
    notes: row.notes ? String(row.notes) : null,
    birthday: row.birthday ? String(row.birthday).slice(0, 10) : null,
    loyaltyTierId: row.loyalty_tier_id
      ? String(row.loyalty_tier_id)
      : "tier-bronze",
    loyaltyPoints: num(row.loyalty_points),
    totalSpent: num(row.total_spent),
    orderCount: num(row.order_count),
    lastOrderAt: row.last_order_at ? String(row.last_order_at) : null,
    wholesalePricing: Boolean(row.wholesale_pricing),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapShiftRow(row: Record<string, unknown>): Shift {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    cashierId: String(row.cashier_id),
    openedAt: String(row.opened_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    openingFloat: num(row.opening_float),
    closingCount:
      row.closing_count != null ? num(row.closing_count) : null,
    expectedCash: num(row.expected_cash),
    variance: row.variance != null ? num(row.variance) : null,
    status: (row.status as Shift["status"]) ?? "open",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapOrderItemRow(
  row: Record<string, unknown>,
  orderId: string,
): OrderItem {
  return {
    id: String(row.id),
    orderId,
    productId: String(row.product_id),
    variantId: null,
    batchId: row.batch_id ? String(row.batch_id) : null,
    productNameAr: String(row.product_name_ar ?? ""),
    quantity: num(row.quantity),
    unitPrice: num(row.unit_price),
    discount: num(row.discount),
    total: num(row.total),
    weightGrams: row.weight_grams != null ? num(row.weight_grams) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

export function mapOrderRow(
  row: Record<string, unknown>,
  items: OrderItem[],
): Order {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    orderNumber: String(row.order_number ?? ""),
    customerId: row.customer_id ? String(row.customer_id) : null,
    type: (row.type as Order["type"]) ?? "pos",
    status: (row.status as Order["status"]) ?? "received",
    items,
    subtotal: num(row.subtotal),
    discountAmount: num(row.discount_amount),
    taxAmount: num(row.tax_amount),
    total: num(row.total),
    paidAmount: num(row.paid_amount),
    paymentStatus: (row.payment_status as Order["paymentStatus"]) ?? "unpaid",
    deliveryDate: row.delivery_date
      ? String(row.delivery_date).slice(0, 10)
      : null,
    deliveryTime: row.delivery_time ? String(row.delivery_time) : null,
    deliveryAddress: row.delivery_address
      ? String(row.delivery_address)
      : null,
    notes: row.notes ? String(row.notes) : null,
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    shiftId: row.shift_id ? String(row.shift_id) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    couponCode: null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

export function mapPaymentRow(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    shiftId: row.shift_id ? String(row.shift_id) : null,
    method: (row.method as Payment["method"]) ?? "cash",
    amount: num(row.amount),
    cashAmount: row.cash_amount != null ? num(row.cash_amount) : null,
    cardAmount: row.card_amount != null ? num(row.card_amount) : null,
    reference: row.reference ? String(row.reference) : null,
    createdAt: String(row.created_at),
  };
}

export function mapEventRow(row: Record<string, unknown>): Event {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    eventType: (row.event_type as Event["eventType"]) ?? "other",
    guestCount: num(row.guest_count, 1),
    packagingColors: Array.isArray(row.packaging_colors)
      ? (row.packaging_colors as string[])
      : [],
    giftCardMessage: row.gift_card_message
      ? String(row.gift_card_message)
      : null,
    giftCardPhrase: row.gift_card_phrase
      ? String(row.gift_card_phrase)
      : null,
    specialNotes: row.special_notes ? String(row.special_notes) : null,
    createdAt: String(row.created_at),
  };
}

export function mapInventoryMovementRow(
  row: Record<string, unknown>,
): InventoryMovement {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    productId: String(row.product_id),
    batchId: row.batch_id ? String(row.batch_id) : null,
    type: (row.type as InventoryMovement["type"]) ?? "adjust",
    quantity: num(row.quantity),
    referenceType: row.reference_type ? String(row.reference_type) : null,
    referenceId: row.reference_id ? String(row.reference_id) : null,
    notes: row.notes ? String(row.notes) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}

export function mapUserProfileRow(
  row: Record<string, unknown>,
): import("@/types").UserProfile {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    roleKey: (row.role_key as import("@/types").RoleKey) ?? "cashier",
    fullName: String(row.full_name ?? ""),
    phone: row.phone ? String(row.phone) : null,
    avatarUrl: null,
    isActive: row.is_active !== false,
    createdAt: String(row.created_at),
  };
}

export function shiftRow(shift: Shift) {
  return {
    id: shift.id,
    branch_id: shift.branchId,
    cashier_id: shift.cashierId,
    opened_at: shift.openedAt,
    closed_at: shift.closedAt,
    opening_float: shift.openingFloat,
    closing_count: shift.closingCount,
    expected_cash: shift.expectedCash,
    variance: shift.variance,
    status: shift.status,
    created_at: shift.createdAt,
    updated_at: shift.updatedAt,
  };
}

export function batchRow(batch: Batch) {
  return {
    id: batch.id,
    product_id: batch.productId,
    branch_id: batch.branchId,
    batch_number: batch.batchNumber,
    quantity: batch.quantity,
    expiry_date: batch.expiryDate,
    cost_per_unit: batch.costPerUnit,
    received_at: batch.receivedAt,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
}

export function mapLoyaltyTierRow(
  row: Record<string, unknown>,
): import("@/types").LoyaltyTier {
  return {
    id: String(row.id),
    key: String(row.tier_key ?? row.key ?? "bronze"),
    nameAr: String(row.name_ar ?? ""),
    nameEn: String(row.name_en ?? ""),
    minPoints: num(row.min_points),
    discountPercent: num(row.discount_percent),
    priority: num(row.priority),
    color: String(row.color ?? "#C4956A"),
  };
}

export function mapSupplierRow(
  row: Record<string, unknown>,
): import("@/types").Supplier {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    name: String(row.name ?? ""),
    contactPerson: String(row.contact_person ?? ""),
    phone: String(row.phone ?? ""),
    email: row.email ? String(row.email) : null,
    address: String(row.address ?? ""),
    notes: row.notes ? String(row.notes) : null,
    balance: num(row.balance),
    isActive: row.is_active !== false,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapExpenseRow(
  row: Record<string, unknown>,
): import("@/types").Expense {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    category: String(row.category ?? ""),
    description: String(row.description ?? ""),
    amount: num(row.amount),
    date: String(row.expense_date ?? row.date ?? "").slice(0, 10),
    isRecurring: Boolean(row.is_recurring),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapReturnRow(
  row: Record<string, unknown>,
  items: import("@/types").ReturnItem[],
): import("@/types").Return {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    orderId: String(row.order_id),
    returnNumber: String(row.return_number ?? ""),
    items,
    refundMethod: (row.refund_method as import("@/types").RefundMethod) ?? "cash",
    totalRefund: num(row.total_refund),
    notes: row.notes ? String(row.notes) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapReturnItemRow(
  row: Record<string, unknown>,
  returnId: string,
): import("@/types").ReturnItem {
  return {
    id: String(row.id),
    returnId,
    orderItemId: String(row.order_item_id ?? ""),
    productId: String(row.product_id ?? ""),
    quantity: num(row.quantity),
    restock: row.restock !== false,
    refundAmount: num(row.refund_amount),
  };
}

export function mapDiscountRow(
  row: Record<string, unknown>,
): import("@/types").Discount {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    name: String(row.name ?? ""),
    type: (row.discount_type as import("@/types").DiscountType) ?? "percentage",
    value: num(row.value),
    minCartAmount: num(row.min_cart_amount),
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : null,
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : null,
    isActive: row.is_active !== false,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapPurchaseOrderItemRow(
  row: Record<string, unknown>,
  purchaseOrderId: string,
): import("@/types").PurchaseOrderItem {
  return {
    id: String(row.id),
    purchaseOrderId,
    productId: String(row.product_id ?? ""),
    productNameAr: String(row.product_name_ar ?? ""),
    quantity: num(row.quantity),
    receivedQuantity: num(row.received_quantity),
    unitCost: num(row.unit_cost),
    total: num(row.total),
  };
}

export function mapPurchaseOrderRow(
  row: Record<string, unknown>,
  items: import("@/types").PurchaseOrderItem[],
): import("@/types").PurchaseOrder {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    supplierId: String(row.supplier_id),
    poNumber: String(row.po_number ?? ""),
    status: (row.status as import("@/types").PurchaseOrderStatus) ?? "draft",
    items,
    subtotal: num(row.subtotal),
    taxAmount: num(row.tax_amount),
    total: num(row.total),
    notes: row.notes ? String(row.notes) : null,
    expectedDate: row.expected_date
      ? String(row.expected_date).slice(0, 10)
      : null,
    receivedAt: row.received_at ? String(row.received_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapInvoiceRow(
  row: Record<string, unknown>,
): import("@/types").Invoice {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    invoiceNumber: String(row.invoice_number ?? ""),
    qrPayload: row.qr_payload ? String(row.qr_payload) : null,
    printedAt: row.printed_at ? String(row.printed_at) : null,
    createdAt: String(row.created_at),
  };
}

export function mapAuditLogRow(
  row: Record<string, unknown>,
): import("@/types").AuditLog {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    action: String(row.action ?? ""),
    entityType: String(row.entity_type ?? ""),
    entityId: row.entity_id ? String(row.entity_id) : "",
    oldValues: (row.old_values as Record<string, unknown> | null) ?? null,
    newValues: (row.new_values as Record<string, unknown> | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export function mapCouponRow(row: Record<string, unknown>): import("@/types").Coupon {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    code: String(row.code ?? ""),
    type: (row.coupon_type as import("@/types").CouponType) ?? "percentage",
    value: num(row.value),
    minCartAmount: num(row.min_cart_amount),
    maxUses: num(row.max_uses),
    usedCount: num(row.used_count),
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : null,
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : null,
    isActive: row.is_active !== false,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}
