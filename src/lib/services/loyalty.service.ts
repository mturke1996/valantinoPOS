import { LOYALTY_TIERS, getLoyaltyTierByPoints } from "@/lib/constants/loyalty";
import type { Customer, LoyaltyPointsLog, LoyaltyTier } from "@/types";
import { generateId, nowISO } from "@/lib/utils";

export interface EarnPointsInput {
  customer: Customer;
  orderTotal: number;
  pointsPerSar: number;
  orderId: string;
}

export interface EarnPointsResult {
  customer: Customer;
  log: LoyaltyPointsLog;
  tier: LoyaltyTier;
}

export interface RedeemPointsInput {
  customer: Customer;
  points: number;
  orderId?: string | null;
  notes?: string | null;
}

export interface RedeemPointsResult {
  customer: Customer;
  log: LoyaltyPointsLog;
  tier: LoyaltyTier;
}

export function getTier(points: number): LoyaltyTier {
  return getLoyaltyTierByPoints(points);
}

export function getTierById(tierId: string): LoyaltyTier {
  return LOYALTY_TIERS.find((t) => t.id === tierId) ?? LOYALTY_TIERS[0];
}

export function calculateEarnedPoints(
  orderTotal: number,
  pointsPerSar: number,
): number {
  return Math.floor(orderTotal * pointsPerSar);
}

export function earnPoints(input: EarnPointsInput): EarnPointsResult {
  const earned = calculateEarnedPoints(
    input.orderTotal,
    input.pointsPerSar,
  );
  const newBalance = input.customer.loyaltyPoints + earned;
  const tier = getTier(newBalance);

  const customer: Customer = {
    ...input.customer,
    loyaltyPoints: newBalance,
    loyaltyTierId: tier.id,
    updatedAt: nowISO(),
  };

  const log: LoyaltyPointsLog = {
    id: generateId(),
    customerId: customer.id,
    orderId: input.orderId,
    action: "earn",
    points: earned,
    balanceAfter: newBalance,
    notes: `نقاط من طلب بقيمة ${input.orderTotal}`,
    createdAt: nowISO(),
  };

  return { customer, log, tier };
}

export function redeemPoints(input: RedeemPointsInput): RedeemPointsResult {
  const redeemAmount = Math.min(input.points, input.customer.loyaltyPoints);
  if (redeemAmount <= 0) {
    const tier = getTier(input.customer.loyaltyPoints);
    return {
      customer: input.customer,
      log: {
        id: generateId(),
        customerId: input.customer.id,
        orderId: input.orderId ?? null,
        action: "redeem",
        points: 0,
        balanceAfter: input.customer.loyaltyPoints,
        notes: input.notes ?? "لا توجد نقاط كافية",
        createdAt: nowISO(),
      },
      tier,
    };
  }

  const newBalance = input.customer.loyaltyPoints - redeemAmount;
  const tier = getTier(newBalance);

  const customer: Customer = {
    ...input.customer,
    loyaltyPoints: newBalance,
    loyaltyTierId: tier.id,
    updatedAt: nowISO(),
  };

  const log: LoyaltyPointsLog = {
    id: generateId(),
    customerId: customer.id,
    orderId: input.orderId ?? null,
    action: "redeem",
    points: -redeemAmount,
    balanceAfter: newBalance,
    notes: input.notes ?? `استبدال ${redeemAmount} نقطة`,
    createdAt: nowISO(),
  };

  return { customer, log, tier };
}

export function pointsToCurrency(
  points: number,
  redeemRate: number,
): number {
  return Math.round(points * redeemRate * 100) / 100;
}

export function currencyToPoints(
  amount: number,
  redeemRate: number,
): number {
  if (redeemRate <= 0) return 0;
  return Math.floor(amount / redeemRate);
}

export function updateCustomerTier(customer: Customer): Customer {
  const tier = getTier(customer.loyaltyPoints);
  return {
    ...customer,
    loyaltyTierId: tier.id,
    updatedAt: nowISO(),
  };
}
