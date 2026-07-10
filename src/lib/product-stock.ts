import type { Product } from "@/types";

export function isStockTracked(product: Pick<Product, "trackStock">): boolean {
  return product.trackStock !== false;
}

export function canSellProduct(product: Product): boolean {
  if (!product.isActive || product.deletedAt) return false;
  if (!isStockTracked(product)) return true;
  return product.stockQuantity > 0;
}
