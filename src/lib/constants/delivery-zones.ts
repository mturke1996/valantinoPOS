import type { DeliveryZone } from "@/types";

/** Default Libya delivery zones — Tripoli & Benghazi */
export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  { id: "tripoli-center", name: "وسط طرابلس", city: "طرابلس", fee: 15 },
  { id: "tripoli-east", name: "شرق طرابلس", city: "طرابلس", fee: 20 },
  { id: "tripoli-west", name: "غرب طرابلس", city: "طرابلس", fee: 20 },
  { id: "tripoli-south", name: "جنوب طرابلس", city: "طرابلس", fee: 25 },
  { id: "tajoura", name: "تاجوراء", city: "طرابلس", fee: 25 },
  { id: "janzour", name: "جنزور", city: "طرابلس", fee: 30 },
  { id: "benghazi-center", name: "وسط بنغازي", city: "بنغازي", fee: 15 },
  { id: "benghazi-east", name: "شرق بنغازي", city: "بنغازي", fee: 20 },
  { id: "benghazi-west", name: "غرب بنغازي", city: "بنغازي", fee: 20 },
];

export function findDeliveryZone(
  zones: DeliveryZone[],
  zoneIdOrName: string | null | undefined,
): DeliveryZone | null {
  if (!zoneIdOrName) return null;
  const key = zoneIdOrName.trim();
  return (
    zones.find((z) => z.id === key || z.name === key) ?? null
  );
}

export function resolveDeliveryFee(input: {
  zones: DeliveryZone[];
  zoneIdOrName: string | null | undefined;
  defaultFee: number;
  cartTotal: number;
  freeDeliveryThreshold: number | null;
}): number {
  if (
    input.freeDeliveryThreshold != null &&
    input.cartTotal >= input.freeDeliveryThreshold
  ) {
    return 0;
  }
  const zone = findDeliveryZone(input.zones, input.zoneIdOrName);
  return zone?.fee ?? input.defaultFee;
}
