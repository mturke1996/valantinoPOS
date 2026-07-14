"use client";

import { memo } from "react";
import { Scale } from "lucide-react";

import { PosKeyBadge } from "@/components/pos/pos-key-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { ProductImage } from "@/components/shared/product-image";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { canSellProduct, isStockTracked } from "@/lib/product-stock";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface PosProductTileProps {
  product: Product;
  onClick: () => void;
  shortcutNumber?: number;
}

export const PosProductTile = memo(function PosProductTile({
  product,
  onClick,
  shortcutNumber,
}: PosProductTileProps) {
  const tracked = isStockTracked(product);
  const isWeight = product.unitType === "gram" || product.unitType === "kilo";
  const lowStock = tracked && product.stockQuantity <= product.minStock;
  const outOfStock = tracked && product.stockQuantity <= 0;
  const sellable = canSellProduct(product);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!sellable}
      className={cn(
        "bonbon-tile group flex flex-col overflow-hidden text-start",
        !sellable && "pointer-events-none opacity-45",
      )}
    >
      <div className="relative -mx-1 -mt-1 mb-3">
        <ProductImage
          src={product.imageUrl}
          alt={product.nameAr}
          size="hero"
          rounded="lg"
          className="h-32 w-[calc(100%+0.5rem)] max-w-none rounded-b-none border-0 shadow-none"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2">
          {isWeight ? (
            <Badge
              variant="secondary"
              className="gap-0.5 bg-background/85 text-[10px] backdrop-blur-sm"
            >
              <Scale className="size-2.5" />
              وزن
            </Badge>
          ) : (
            <span />
          )}
          {outOfStock ? (
            <Badge variant="destructive" className="text-[10px]">
              نفد
            </Badge>
          ) : lowStock ? (
            <Badge className="border-caramel-500/40 bg-caramel-500/90 text-[10px] text-white">
              منخفض
            </Badge>
          ) : null}
        </div>
        {shortcutNumber ? (
          <PosKeyBadge
            label={String(shortcutNumber)}
            title={`اختصار لوحة المفاتيح Alt+${shortcutNumber}`}
            tone="onDark"
            size="md"
            className="absolute bottom-2 start-2"
          />
        ) : null}
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] px-0.5 text-sm font-medium leading-tight">
        {product.nameAr}
      </p>
      <p className="mt-0.5 px-0.5 font-mono text-[10px] text-muted-foreground">
        {product.sku}
      </p>

      <div className="mt-auto flex items-end justify-between px-0.5 pt-3">
        <CurrencyDisplay
          amount={product.retailPrice}
          className="text-sm font-semibold"
        />
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px] tabular-nums",
            !tracked && "border-pistachio-400/40 text-pistachio-600",
            lowStock && "border-caramel-500/40 text-caramel-500",
          )}
        >
          {tracked ? formatNumber(product.stockQuantity) : "∞"}
        </Badge>
      </div>
    </button>
  );
});
