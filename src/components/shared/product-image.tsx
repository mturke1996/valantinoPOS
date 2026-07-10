"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ProductImageSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

const SIZE_CLASS: Record<ProductImageSize, string> = {
  xs: "size-10",
  sm: "size-14",
  md: "size-20",
  lg: "size-28",
  xl: "size-36",
  hero: "h-44 w-full",
};

const PIXEL_SIZE: Record<ProductImageSize, number> = {
  xs: 40,
  sm: 56,
  md: 80,
  lg: 112,
  xl: 144,
  hero: 352,
};

interface ProductImageProps {
  src?: string | null;
  alt: string;
  size?: ProductImageSize;
  className?: string;
  priority?: boolean;
  rounded?: "md" | "lg" | "xl" | "none";
}

export function ProductImage({
  src,
  alt,
  size = "md",
  className,
  priority = false,
  rounded = "lg",
}: ProductImageProps) {
  const roundedClass =
    rounded === "none"
      ? "rounded-none"
      : rounded === "xl"
        ? "rounded-xl"
        : rounded === "lg"
          ? "rounded-lg"
          : "rounded-md";

  if (!src) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden border border-cacao-800/10 bg-gradient-to-br from-cacao-800/90 to-cacao-900 text-cream-100/40",
          SIZE_CLASS[size],
          roundedClass,
          className,
        )}
        aria-hidden={!alt}
      >
        <ImageIcon className={size === "xs" ? "size-4" : "size-6"} />
      </div>
    );
  }

  const dimension = PIXEL_SIZE[size];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-cacao-800/8 bg-muted shadow-[inset_0_1px_0_hsl(36_33%_97%/0.08)]",
        SIZE_CLASS[size],
        roundedClass,
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={
          size === "hero"
            ? "(max-width: 768px) 100vw, 320px"
            : `(max-width: 768px) ${dimension}px, ${dimension}px`
        }
        className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
        priority={priority}
        unoptimized
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-cacao-900/15 via-transparent to-transparent"
        aria-hidden
      />
    </div>
  );
}
