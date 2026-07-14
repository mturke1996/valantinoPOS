import { processSyncQueue, type SyncQueueItem } from "@/lib/offline/db";
import { getAuthSession } from "@/lib/auth";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { batchRow, shiftRow } from "@/lib/data/cloud-mappers";
import { getState } from "@/lib/data/store";
import type {
  Batch,
  Category,
  Coupon,
  Customer,
  Discount,
  Event,
  Expense,
  Order,
  OrderItem,
  Payment,
  Product,
  Return,
  Settings,
  Shift,
  Supplier,
} from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asCloudUuid(value: string | null | undefined): string | null {
  if (!value || !UUID_RE.test(value)) return null;
  return value;
}

function orderRow(order: Order, branchId: string) {
  return {
    id: order.id,
    branch_id: branchId,
    order_number: order.orderNumber,
    customer_id: order.customerId,
    type: order.type,
    status: order.status,
    subtotal: order.subtotal,
    discount_amount: order.discountAmount,
    tax_amount: order.taxAmount,
    total: order.total,
    paid_amount: order.paidAmount,
    payment_status: order.paymentStatus,
    delivery_date: order.deliveryDate,
    delivery_time: order.deliveryTime,
    delivery_address: order.deliveryAddress,
    delivery_fee: order.deliveryFee,
    delivery_zone: order.deliveryZone,
    delivery_recipient_name: order.deliveryRecipientName,
    delivery_phone: order.deliveryPhone,
    delivery_instructions: order.deliveryInstructions,
    notes: order.notes,
    assigned_to: order.assignedTo,
    shift_id: order.shiftId,
    created_by: order.createdBy,
    deleted_at: order.deletedAt,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

function productRow(product: Product, branchId: string) {
  return {
    id: product.id,
    branch_id: branchId,
    category_id: product.categoryId,
    sku: product.sku,
    barcode: product.barcode || null,
    name_ar: product.nameAr,
    name_en: product.nameEn,
    description: product.description,
    cost_price: product.costPrice,
    retail_price: product.retailPrice,
    wholesale_price: product.wholesalePrice,
    unit_type: product.unitType,
    weight_grams: product.weightGrams,
    origin: product.origin,
    min_stock: product.minStock,
    stock_quantity: product.stockQuantity,
    track_stock: product.trackStock,
    is_bundle: product.isBundle,
    is_active: product.isActive,
    image_url: product.imageUrl || null,
    deleted_at: product.deletedAt,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

function resolveLoyaltyTierId(customer: Customer): string | null {
  if (asCloudUuid(customer.loyaltyTierId)) return customer.loyaltyTierId;
  const legacyKey = customer.loyaltyTierId.replace(/^tier-/, "");
  const tier = getState().loyaltyTiers.find(
    (t) => t.key === legacyKey || t.id === customer.loyaltyTierId,
  );
  return asCloudUuid(tier?.id) ?? null;
}

function customerRow(customer: Customer, branchId: string) {
  return {
    id: customer.id,
    branch_id: branchId,
    name: customer.name,
    phone: customer.phone,
    whatsapp: customer.whatsapp || null,
    email: customer.email || null,
    notes: customer.notes || null,
    birthday: customer.birthday || null,
    loyalty_tier_id: resolveLoyaltyTierId(customer),
    loyalty_points: customer.loyaltyPoints ?? 0,
    total_spent: customer.totalSpent ?? 0,
    order_count: customer.orderCount ?? 0,
    last_order_at: customer.lastOrderAt || null,
    wholesale_pricing: customer.wholesalePricing ?? false,
    deleted_at: customer.deletedAt,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
  };
}

let activeFlush: Promise<number> | null = null;
let flushAgain = false;

async function runOfflineSyncQueue(): Promise<number> {
  const supabase = isSupabaseConfigured() ? createClient() : null;
  const authSession = getAuthSession();
  if (!supabase || authSession?.source === "demo") {
    return processSyncQueue(async () => {
      // Demo mode is local-first by design; localStorage already contains the write.
    });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Cloud authentication is required for sync");

  const syncBranchId = authSession?.branchId;
  if (!syncBranchId) {
    throw new Error("لا يوجد فرع مرتبط بالجلسة — أعد تسجيل الدخول");
  }

  return processSyncQueue(async (item: SyncQueueItem) => {
    const payload = JSON.parse(item.payload) as Record<string, unknown>;

    if (item.action === "create_order") {
      const order = payload.order as Order;
      const event = (payload.event as Event | null | undefined) ?? null;
      const { error: orderError } = await supabase
        .from("orders")
        .upsert(orderRow(order, syncBranchId), { onConflict: "id" });
      if (orderError) throw orderError;

      if (order.items.length > 0) {
        const { error: itemsError } = await supabase.from("order_items").upsert(
          order.items.map((orderItem) => ({
            id: orderItem.id,
            branch_id: syncBranchId,
            order_id: order.id,
            product_id: orderItem.productId,
            batch_id: orderItem.batchId,
            product_name_ar: orderItem.productNameAr,
            quantity: orderItem.quantity,
            unit_price: orderItem.unitPrice,
            discount: orderItem.discount,
            total: orderItem.total,
            weight_grams: orderItem.weightGrams,
            notes: orderItem.notes,
          })),
          { onConflict: "id" },
        );
        if (itemsError) throw itemsError;
      }

      if (event) {
        const { error: eventError } = await supabase.from("events").upsert(
          {
            id: event.id,
            branch_id: syncBranchId,
            order_id: order.id,
            event_type: event.eventType,
            guest_count: event.guestCount,
            packaging_colors: event.packagingColors,
            gift_card_message: event.giftCardMessage,
            gift_card_phrase: event.giftCardPhrase,
            special_notes: event.specialNotes,
            created_at: event.createdAt,
          },
          { onConflict: "id" },
        );
        if (eventError) throw eventError;
      }

      const statusHistory = payload.statusHistory as
        | {
            id: string;
            orderId: string;
            fromStatus: string | null;
            toStatus: string;
            changedBy: string | null;
            changedAt: string;
            notes: string | null;
          }
        | null
        | undefined;
      if (statusHistory?.id) {
        const { error: historyError } = await supabase
          .from("order_status_history")
          .upsert(
            {
              id: statusHistory.id,
              branch_id: syncBranchId,
              order_id: statusHistory.orderId,
              from_status: statusHistory.fromStatus,
              to_status: statusHistory.toStatus,
              changed_by: asCloudUuid(statusHistory.changedBy),
              changed_at: statusHistory.changedAt,
              notes: statusHistory.notes,
            },
            { onConflict: "id" },
          );
        if (historyError) throw historyError;
      }
      return;
    }

    if (item.action === "update_event_booking") {
      const order = payload.order as Order;
      const event = payload.event as Event;
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          delivery_date: order.deliveryDate,
          delivery_time: order.deliveryTime,
          delivery_address: order.deliveryAddress,
          delivery_fee: order.deliveryFee,
          delivery_zone: order.deliveryZone,
          delivery_recipient_name: order.deliveryRecipientName,
          delivery_phone: order.deliveryPhone,
          delivery_instructions: order.deliveryInstructions,
          total: order.total,
          payment_status: order.paymentStatus,
          notes: order.notes,
          updated_at: order.updatedAt,
        })
        .eq("id", order.id)
        .eq("branch_id", syncBranchId);
      if (orderError) throw orderError;

      const { error: eventError } = await supabase.from("events").upsert(
        {
          id: event.id,
          branch_id: syncBranchId,
          order_id: order.id,
          event_type: event.eventType,
          guest_count: event.guestCount,
          packaging_colors: event.packagingColors,
          gift_card_message: event.giftCardMessage,
          gift_card_phrase: event.giftCardPhrase,
          special_notes: event.specialNotes,
          created_at: event.createdAt,
        },
        { onConflict: "id" },
      );
      if (eventError) throw eventError;
      return;
    }

    if (item.action === "process_payment") {
      const payment = payload.payment as Payment;
      const { error } = await supabase.from("payments").upsert(
        {
          id: payment.id,
          branch_id: syncBranchId,
          order_id: payment.orderId,
          shift_id: payment.shiftId ?? null,
          method: payment.method,
          amount: payment.amount,
          cash_amount: payment.cashAmount,
          card_amount: payment.cardAmount,
          reference: payment.reference,
          created_by: asCloudUuid(
            (payload.createdBy as string | null) ?? null,
          ),
          created_at: payment.createdAt,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;

      const orderPatch = payload.orderPatch as
        | {
            id: string;
            paidAmount: number;
            paymentStatus: string;
            status?: string;
            updatedAt: string;
          }
        | undefined;
      if (orderPatch?.id) {
        const patch: Record<string, unknown> = {
          paid_amount: orderPatch.paidAmount,
          payment_status: orderPatch.paymentStatus,
          updated_at: orderPatch.updatedAt,
        };
        if (orderPatch.status) patch.status = orderPatch.status;
        const { error: orderError } = await supabase
          .from("orders")
          .update(patch)
          .eq("id", orderPatch.id)
          .eq("branch_id", syncBranchId);
        if (orderError) throw orderError;
      }

      const history = payload.statusHistory as
        | {
            id: string;
            orderId: string;
            fromStatus: string | null;
            toStatus: string;
            changedBy: string | null;
            changedAt: string;
            notes: string | null;
          }
        | null
        | undefined;
      if (history?.id) {
        const { error: historyError } = await supabase
          .from("order_status_history")
          .upsert(
            {
              id: history.id,
              branch_id: syncBranchId,
              order_id: history.orderId,
              from_status: history.fromStatus,
              to_status: history.toStatus,
              changed_by: asCloudUuid(history.changedBy),
              changed_at: history.changedAt,
              notes: history.notes,
            },
            { onConflict: "id" },
          );
        if (historyError) throw historyError;
      }
      return;
    }

    if (item.action === "update_status") {
      const { error } = await supabase
        .from("orders")
        .update({
          status: payload.status,
          updated_at: payload.updatedAt,
        })
        .eq("id", payload.orderId)
        .eq("branch_id", syncBranchId);
      if (error) throw error;

      const history = payload.statusHistory as
        | {
            id: string;
            orderId: string;
            fromStatus: string | null;
            toStatus: string;
            changedBy: string | null;
            changedAt: string;
            notes: string | null;
          }
        | null
        | undefined;
      if (history?.id) {
        const { error: historyError } = await supabase
          .from("order_status_history")
          .upsert(
            {
              id: history.id,
              branch_id: syncBranchId,
              order_id: history.orderId,
              from_status: history.fromStatus,
              to_status: history.toStatus,
              changed_by: asCloudUuid(history.changedBy),
              changed_at: history.changedAt,
              notes: history.notes,
            },
            { onConflict: "id" },
          );
        if (historyError) throw historyError;
      }
      return;
    }

    if (item.action === "delete_order") {
      const { error } = await supabase
        .from("orders")
        .update({
          deleted_at: payload.deletedAt,
          updated_at: payload.updatedAt,
        })
        .eq("id", payload.orderId)
        .eq("branch_id", syncBranchId);
      if (error) throw error;
      return;
    }

    if (
      item.action === "create_product" ||
      item.action === "update_product"
    ) {
      const product = payload.product as Product;
      const { error } = await supabase
        .from("products")
        .upsert(productRow(product, syncBranchId), { onConflict: "id" });
      if (error) throw error;
      return;
    }

    if (item.action === "create_category") {
      const category = payload.category as Category;
      const { error } = await supabase.from("categories").upsert(
        {
          id: category.id,
          branch_id: syncBranchId,
          parent_id: category.parentId,
          name_ar: category.nameAr,
          name_en: category.nameEn,
          slug: category.slug,
          sort_order: category.sortOrder,
          deleted_at: category.deletedAt,
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      return;
    }

    if (
      item.action === "create_customer" ||
      item.action === "update_customer"
    ) {
      const customer = payload.customer as Customer;
      const { error } = await supabase
        .from("customers")
        .upsert(customerRow(customer, syncBranchId), { onConflict: "id" });
      if (error) throw error;
      return;
    }

    if (item.action === "receive_inventory") {
      const batch = payload.batch as Batch;
      const movement = payload.movement as
        | import("@/types").InventoryMovement
        | undefined;
      const { error } = await supabase.from("batches").upsert(
        {
          id: batch.id,
          product_id: batch.productId,
          branch_id: syncBranchId,
          batch_number: batch.batchNumber,
          quantity: batch.quantity,
          expiry_date: batch.expiryDate,
          cost_per_unit: batch.costPerUnit,
          received_at: batch.receivedAt,
          created_at: batch.createdAt,
          updated_at: batch.updatedAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      if (movement) {
        const { error: movementError } = await supabase
          .from("inventory_movements")
          .upsert(
            {
              id: movement.id,
              branch_id: syncBranchId,
              product_id: movement.productId,
              batch_id: movement.batchId,
              type: movement.type,
              quantity: movement.quantity,
              reference_type: movement.referenceType,
              reference_id: asCloudUuid(movement.referenceId),
              notes: movement.notes,
              created_by: asCloudUuid(movement.createdBy),
              created_at: movement.createdAt,
            },
            { onConflict: "id" },
          );
        if (movementError) throw movementError;
      }
      return;
    }

    if (item.action === "open_shift" || item.action === "close_shift") {
      const shift = payload.shift as Shift;
      const { error } = await supabase
        .from("shifts")
        .upsert(shiftRow({ ...shift, branchId: syncBranchId }), {
          onConflict: "id",
        });
      if (error) throw error;
      return;
    }

    if (item.action === "update_batches") {
      const batches = payload.batches as Batch[];
      if (batches.length === 0) return;
      const { error } = await supabase
        .from("batches")
        .upsert(
          batches.map((batch) =>
            batchRow({ ...batch, branchId: syncBranchId }),
          ),
          { onConflict: "id" },
        );
      if (error) throw error;
      return;
    }

    if (item.action === "sync_order_items") {
      const orderId = payload.orderId as string;
      const items = payload.items as OrderItem[];
      if (items.length === 0) return;
      const { error } = await supabase.from("order_items").upsert(
        items.map((orderItem) => ({
          id: orderItem.id,
          branch_id: syncBranchId,
          order_id: orderId,
          product_id: orderItem.productId,
          batch_id: orderItem.batchId,
          product_name_ar: orderItem.productNameAr,
          quantity: orderItem.quantity,
          unit_price: orderItem.unitPrice,
          discount: orderItem.discount,
          total: orderItem.total,
          weight_grams: orderItem.weightGrams,
          notes: orderItem.notes,
        })),
        { onConflict: "id" },
      );
      if (error) throw error;
      return;
    }

    if (item.action === "update_category") {
      const category = payload.category as Category;
      const { error } = await supabase.from("categories").upsert(
        {
          id: category.id,
          branch_id: syncBranchId,
          parent_id: category.parentId,
          name_ar: category.nameAr,
          name_en: category.nameEn,
          slug: category.slug,
          sort_order: category.sortOrder,
          deleted_at: category.deletedAt,
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      return;
    }

    if (item.action === "create_return") {
      const returnRecord = payload.returnRecord as Return;
      const { error: returnError } = await supabase.from("returns").upsert(
        {
          id: returnRecord.id,
          branch_id: syncBranchId,
          order_id: returnRecord.orderId,
          return_number: returnRecord.returnNumber,
          refund_method: returnRecord.refundMethod,
          total_refund: returnRecord.totalRefund,
          notes: returnRecord.notes,
          created_by: returnRecord.createdBy,
          created_at: returnRecord.createdAt,
          updated_at: returnRecord.updatedAt,
        },
        { onConflict: "id" },
      );
      if (returnError) throw returnError;
      if (returnRecord.items.length > 0) {
        const { error: itemsError } = await supabase.from("return_items").upsert(
          returnRecord.items.map((line) => ({
            id: line.id,
            branch_id: syncBranchId,
            return_id: returnRecord.id,
            order_item_id: line.orderItemId,
            product_id: line.productId,
            quantity: line.quantity,
            restock: line.restock,
            refund_amount: line.refundAmount,
            created_at: returnRecord.createdAt,
          })),
          { onConflict: "id" },
        );
        if (itemsError) throw itemsError;
      }
      return;
    }

    if (item.action === "sync_settings") {
      const settings = payload.settings as Settings;
      const appValue = {
        country: settings.country,
        taxRate: settings.taxRate,
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        locale: settings.locale,
        loyaltyPointsPerSar: settings.loyaltyPointsPerSar,
        loyaltyRedeemRate: settings.loyaltyRedeemRate,
        orderNumberPrefix: settings.orderNumberPrefix,
        invoiceNumberPrefix: settings.invoiceNumberPrefix,
        walkInSalesEnabled: settings.walkInSalesEnabled,
        defaultDeliveryFee: settings.defaultDeliveryFee,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        thermalPaperWidth: settings.thermalPaperWidth,
        invoiceFooter: settings.invoiceFooter,
        whatsappCountryCode: settings.whatsappCountryCode,
        deliveryZones: settings.deliveryZones,
        autoWhatsAppOnSale: settings.autoWhatsAppOnSale,
        taxNumber: settings.taxNumber,
        commercialRegister: settings.commercialRegister,
      };
      const branchValue = {
        branchName: settings.branchName,
        branchAddress: settings.branchAddress,
        branchPhone: settings.branchPhone,
        logoUrl: settings.logoUrl,
      };
      const { error: appError } = await supabase.from("settings").upsert(
        {
          branch_id: syncBranchId,
          key: "app",
          value: appValue,
        },
        { onConflict: "branch_id,key" },
      );
      if (appError) throw appError;
      const { error: branchError } = await supabase.from("settings").upsert(
        {
          branch_id: syncBranchId,
          key: "branch",
          value: branchValue,
        },
        { onConflict: "branch_id,key" },
      );
      if (branchError) throw branchError;
      return;
    }

    if (
      item.action === "create_supplier" ||
      item.action === "update_supplier"
    ) {
      const supplier = payload.supplier as Supplier;
      const { error } = await supabase.from("suppliers").upsert(
        {
          id: supplier.id,
          branch_id: syncBranchId,
          name: supplier.name,
          contact_person: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          notes: supplier.notes,
          balance: supplier.balance,
          is_active: supplier.isActive,
          deleted_at: supplier.deletedAt,
          created_at: supplier.createdAt,
          updated_at: supplier.updatedAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      return;
    }

    if (item.action === "create_expense") {
      const expense = payload.expense as Expense;
      const { error } = await supabase.from("expenses").upsert(
        {
          id: expense.id,
          branch_id: syncBranchId,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          expense_date: expense.date,
          is_recurring: expense.isRecurring,
          created_by: expense.createdBy,
          created_at: expense.createdAt,
          updated_at: expense.updatedAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      return;
    }

    if (
      item.action === "create_discount" ||
      item.action === "update_discount"
    ) {
      const discount = payload.discount as Discount;
      const { error } = await supabase.from("discounts").upsert(
        {
          id: discount.id,
          branch_id: syncBranchId,
          name: discount.name,
          discount_type: discount.type,
          value: discount.value,
          min_cart_amount: discount.minCartAmount,
          start_date: discount.startDate,
          end_date: discount.endDate,
          is_active: discount.isActive,
          deleted_at: discount.deletedAt,
          created_at: discount.createdAt,
          updated_at: discount.updatedAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      return;
    }

    if (
      item.action === "create_coupon" ||
      item.action === "update_coupon"
    ) {
      const coupon = payload.coupon as Coupon;
      const { error } = await supabase.from("coupons").upsert(
        {
          id: coupon.id,
          branch_id: syncBranchId,
          code: coupon.code,
          coupon_type: coupon.type,
          value: coupon.value,
          min_cart_amount: coupon.minCartAmount,
          max_uses: coupon.maxUses,
          used_count: coupon.usedCount,
          start_date: coupon.startDate,
          end_date: coupon.endDate,
          is_active: coupon.isActive,
          deleted_at: coupon.deletedAt,
          created_at: coupon.createdAt,
          updated_at: coupon.updatedAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      return;
    }

    if (
      item.action === "create_purchase_order" ||
      item.action === "update_purchase_order"
    ) {
      const purchaseOrder = payload.purchaseOrder as import("@/types").PurchaseOrder;
      const { error: poError } = await supabase.from("purchase_orders").upsert(
        {
          id: purchaseOrder.id,
          branch_id: syncBranchId,
          supplier_id: purchaseOrder.supplierId,
          po_number: purchaseOrder.poNumber,
          status: purchaseOrder.status,
          subtotal: purchaseOrder.subtotal,
          tax_amount: purchaseOrder.taxAmount,
          total: purchaseOrder.total,
          notes: purchaseOrder.notes,
          expected_date: purchaseOrder.expectedDate,
          received_at: purchaseOrder.receivedAt,
          created_at: purchaseOrder.createdAt,
          updated_at: purchaseOrder.updatedAt,
        },
        { onConflict: "id" },
      );
      if (poError) throw poError;
      if (purchaseOrder.items.length > 0) {
        const { error: itemsError } = await supabase
          .from("purchase_order_items")
          .upsert(
            purchaseOrder.items.map((line) => ({
              id: line.id,
              branch_id: syncBranchId,
              purchase_order_id: purchaseOrder.id,
              product_id: line.productId || null,
              product_name_ar: line.productNameAr,
              quantity: line.quantity,
              received_quantity: line.receivedQuantity,
              unit_cost: line.unitCost,
              total: line.total,
            })),
            { onConflict: "id" },
          );
        if (itemsError) throw itemsError;
      }
      return;
    }

    if (item.action === "create_inventory_movement") {
      const movement = payload.movement as import("@/types").InventoryMovement;
      const { error } = await supabase.from("inventory_movements").upsert(
        {
          id: movement.id,
          branch_id: syncBranchId,
          product_id: movement.productId,
          batch_id: movement.batchId,
          type: movement.type,
          quantity: movement.quantity,
          reference_type: movement.referenceType,
          reference_id: asCloudUuid(movement.referenceId),
          notes: movement.notes,
          created_by: asCloudUuid(movement.createdBy),
          created_at: movement.createdAt,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;
      return;
    }

    if (item.action === "create_audit_log") {
      const log = payload.log as import("@/types").AuditLog;
      const { error } = await supabase.from("audit_logs").upsert(
        {
          id: log.id,
          branch_id: syncBranchId,
          user_id: asCloudUuid(log.userId),
          action: log.action,
          entity_type: log.entityType,
          entity_id: asCloudUuid(log.entityId),
          old_values: log.oldValues,
          new_values: log.newValues,
          created_at: log.createdAt,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;
      return;
    }

    if (item.action === "create_invoice" || item.action === "update_invoice") {
      const invoice = payload.invoice as import("@/types").Invoice;
      const { error } = await supabase.from("invoices").upsert(
        {
          id: invoice.id,
          branch_id: syncBranchId,
          order_id: invoice.orderId,
          invoice_number: invoice.invoiceNumber,
          qr_payload: invoice.qrPayload,
          printed_at: invoice.printedAt,
          created_at: invoice.createdAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      return;
    }

    throw new Error(`Unhandled sync action: ${item.action}`);
  });
}

/**
 * Push the outbound queue to Supabase.
 * Concurrent callers mark a follow-up pass so items enqueued mid-flush
 * are processed immediately instead of waiting for the next interval.
 */
export function flushOfflineSyncQueue(): Promise<number> {
  flushAgain = true;
  if (activeFlush) return activeFlush;

  activeFlush = (async () => {
    let total = 0;
    do {
      flushAgain = false;
      total += await runOfflineSyncQueue();
    } while (flushAgain);
    return total;
  })().finally(() => {
    activeFlush = null;
    if (flushAgain) {
      void flushOfflineSyncQueue().catch(() => undefined);
    }
  });

  return activeFlush;
}
