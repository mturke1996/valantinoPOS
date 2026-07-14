import type {
  LineTotalInput,
  OrderTotalsInput,
  OrderTotalsResult,
} from "@/types";
import { roundMoney } from "@/lib/utils";

export function calculateLineTotal(input: LineTotalInput): number {
  const { quantity, unitPrice, discount = 0 } = input;
  const gross = quantity * unitPrice;
  return roundMoney(Math.max(0, gross - discount));
}

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotalsResult {
  const { items, discountAmount = 0, deliveryFee = 0, taxRate } = input;

  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + calculateLineTotal(item), 0),
  );

  const orderDiscount = roundMoney(Math.min(discountAmount, subtotal));
  const taxableBase = roundMoney(subtotal - orderDiscount);
  const taxAmount = roundMoney(taxableBase * (taxRate / 100));
  const normalizedDeliveryFee = roundMoney(Math.max(0, deliveryFee));
  const total = roundMoney(taxableBase + taxAmount + normalizedDeliveryFee);

  return {
    subtotal,
    discountAmount: orderDiscount,
    taxAmount,
    deliveryFee: normalizedDeliveryFee,
    total,
  };
}

export function resolveUnitPrice(
  retailPrice: number,
  wholesalePrice: number,
  wholesalePricing: boolean,
): number {
  return wholesalePricing ? wholesalePrice : retailPrice;
}

export function applyTierDiscount(
  amount: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0) return amount;
  return roundMoney(amount * (1 - discountPercent / 100));
}
