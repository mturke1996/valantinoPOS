export type PackageSeason = "ramadan" | "eid" | "wedding" | "corporate";

export interface SeasonalPackageItem {
  nameAr: string;
  quantity: number;
  unitPrice: number;
}

export interface SeasonalPackage {
  id: string;
  season: PackageSeason;
  nameAr: string;
  description: string;
  /** Suggested deposit as fraction of total (0–1) */
  suggestedDepositPercent: number;
  items: SeasonalPackageItem[];
}

export const PACKAGE_SEASON_LABELS: Record<PackageSeason, string> = {
  ramadan: "رمضان",
  eid: "العيد",
  wedding: "أعراس",
  corporate: "شركات",
};

export const SEASONAL_PACKAGES: SeasonalPackage[] = [
  {
    id: "ramadan-iftar-box",
    season: "ramadan",
    nameAr: "صندوق إفطار رمضاني",
    description: "تشكيلة شوكولاتة فاخرة لضيافة الإفطار — مناسبة للعائلات.",
    suggestedDepositPercent: 0.4,
    items: [
      { nameAr: "تشكيلة بلجيكية 500غ", quantity: 1, unitPrice: 85 },
      { nameAr: "تمر محشو بالشوكولاتة", quantity: 2, unitPrice: 45 },
      { nameAr: "ترافل فاخر", quantity: 1, unitPrice: 55 },
    ],
  },
  {
    id: "ramadan-family",
    season: "ramadan",
    nameAr: "باقة رمضان العائلية",
    description: "كمية أكبر للتجمعات العائلية مع تغليف ذهبي.",
    suggestedDepositPercent: 0.35,
    items: [
      { nameAr: "صندوق فاخر 1كغ", quantity: 2, unitPrice: 140 },
      { nameAr: "شوكولاتة بالحليب", quantity: 3, unitPrice: 35 },
      { nameAr: "بطاقة معايدة رمضانية", quantity: 1, unitPrice: 10 },
    ],
  },
  {
    id: "eid-gift",
    season: "eid",
    nameAr: "هدية العيد الكلاسيكية",
    description: "علبة أنيقة مع بطاقة تهنئة — مثالية للزيارات.",
    suggestedDepositPercent: 0.5,
    items: [
      { nameAr: "علبة هدايا متوسطة", quantity: 1, unitPrice: 95 },
      { nameAr: "شوكولاتة داكنة فاخرة", quantity: 1, unitPrice: 60 },
    ],
  },
  {
    id: "eid-premium",
    season: "eid",
    nameAr: "باقة العيد المميزة",
    description: "تشكيلة فاخرة مع تغليف مخصص واسم المستلم.",
    suggestedDepositPercent: 0.4,
    items: [
      { nameAr: "صندوق بريميوم 750غ", quantity: 1, unitPrice: 180 },
      { nameAr: "ترافل مشكل", quantity: 2, unitPrice: 50 },
      { nameAr: "تغليف شخصي", quantity: 1, unitPrice: 25 },
    ],
  },
  {
    id: "wedding-guest",
    season: "wedding",
    nameAr: "توزيعات ضيوف العرس",
    description: "قطع فردية أنيقة لضيوف المناسبة (سعر للقطعة × الكمية).",
    suggestedDepositPercent: 0.5,
    items: [
      { nameAr: "قطعة توزيعات فاخرة", quantity: 50, unitPrice: 4.5 },
      { nameAr: "شريط وبطاقة اسم", quantity: 50, unitPrice: 0.8 },
    ],
  },
  {
    id: "corporate-box",
    season: "corporate",
    nameAr: "صندوق الشركات",
    description: "هدايا شركات مع إمكانية الشعار والكمية الكبيرة.",
    suggestedDepositPercent: 0.3,
    items: [
      { nameAr: "صندوق شركات 400غ", quantity: 20, unitPrice: 55 },
      { nameAr: "تغليف بشعار", quantity: 20, unitPrice: 8 },
    ],
  },
];

export function packageTotal(pkg: SeasonalPackage): number {
  return pkg.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
}

export function packageSuggestedDeposit(pkg: SeasonalPackage): number {
  return Math.round(packageTotal(pkg) * pkg.suggestedDepositPercent * 100) / 100;
}
