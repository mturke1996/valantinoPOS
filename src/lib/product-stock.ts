import type { Product } from "@/types";

/** Inventory system removed — products are always sellable when active. */
export function isStockTracked(_product: Pick<Product, "trackStock">): boolean {
  return false;
}

export function canSellProduct(product: Product): boolean {
  return Boolean(product.isActive && !product.deletedAt);
}
