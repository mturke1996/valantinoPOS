import type { LoyaltyTier } from "@/types";

export const LOYALTY_TIERS: readonly LoyaltyTier[] = [
  {
    id: "tier-bronze",
    key: "bronze",
    nameAr: "برونزي",
    nameEn: "Bronze",
    minPoints: 0,
    discountPercent: 0,
    priority: 1,
    color: "#C4956A",
  },
  {
    id: "tier-silver",
    key: "silver",
    nameAr: "فضي",
    nameEn: "Silver",
    minPoints: 500,
    discountPercent: 3,
    priority: 2,
    color: "#A8A8A8",
  },
  {
    id: "tier-gold",
    key: "gold",
    nameAr: "ذهبي",
    nameEn: "Gold",
    minPoints: 1500,
    discountPercent: 5,
    priority: 3,
    color: "#D4AF37",
  },
  {
    id: "tier-platinum",
    key: "platinum",
    nameAr: "بلاتيني",
    nameEn: "Platinum",
    minPoints: 4000,
    discountPercent: 8,
    priority: 4,
    color: "#8FB996",
  },
  {
    id: "tier-diamond",
    key: "diamond",
    nameAr: "ماسي",
    nameEn: "Diamond",
    minPoints: 10000,
    discountPercent: 12,
    priority: 5,
    color: "#8B3A62",
  },
] as const;

export const DEFAULT_LOYALTY_TIER_ID = "tier-bronze";

export function getLoyaltyTierById(id: string): LoyaltyTier | undefined {
  return LOYALTY_TIERS.find((t) => t.id === id);
}

export function getLoyaltyTierByPoints(points: number): LoyaltyTier {
  const sorted = [...LOYALTY_TIERS].sort((a, b) => b.minPoints - a.minPoints);
  return sorted.find((t) => points >= t.minPoints) ?? LOYALTY_TIERS[0];
}
