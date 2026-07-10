import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export type OrderStatus =
  | "received"
  | "reviewing"
  | "preparing"
  | "packaging"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "expiring"
  | "not_tracked";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        order: "border-cacao-800/12 bg-cream-100/80 text-cacao-800 dark:border-cacao-800/24 dark:bg-cacao-800/30 dark:text-cream-100",
        payment: "border-cacao-800/12 bg-cream-100/80 text-cacao-800 dark:border-cacao-800/24 dark:bg-cacao-800/30 dark:text-cream-100",
        stock: "border-cacao-800/12 bg-cream-100/80 text-cacao-800 dark:border-cacao-800/24 dark:bg-cacao-800/30 dark:text-cream-100",
      },
      tone: {
        default: "",
        success:
          "border-pistachio-400/30 bg-pistachio-400/10 text-cacao-800 dark:text-pistachio-400",
        warning:
          "border-caramel-500/30 bg-caramel-500/10 text-cacao-800 dark:text-caramel-500",
        destructive:
          "border-berry-500/30 bg-berry-500/10 text-berry-500 dark:text-berry-500",
        accent:
          "border-gold-400/30 bg-gold-400/10 text-cacao-800 dark:text-gold-400",
      },
    },
    defaultVariants: {
      variant: "order",
      tone: "default",
    },
  },
);

const ORDER_LABELS: Record<OrderStatus, string> = {
  received: "مستلم",
  reviewing: "قيد المراجعة",
  preparing: "قيد التحضير",
  packaging: "التغليف",
  ready: "جاهز",
  out_for_delivery: "في الطريق",
  delivered: "تم التسليم",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "غير مدفوع",
  partial: "مدفوع جزئياً",
  paid: "مدفوع",
  refunded: "مسترد",
};

const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: "متوفر",
  low_stock: "مخزون منخفض",
  out_of_stock: "نفد المخزون",
  expiring: "قرب الانتهاء",
  not_tracked: "بدون تتبع مخزون",
};

function getOrderTone(status: OrderStatus): VariantProps<typeof statusBadgeVariants>["tone"] {
  switch (status) {
    case "completed":
    case "delivered":
      return "success";
    case "cancelled":
      return "destructive";
    case "ready":
    case "out_for_delivery":
      return "accent";
    case "preparing":
    case "packaging":
      return "warning";
    default:
      return "default";
  }
}

function getPaymentTone(
  status: PaymentStatus,
): VariantProps<typeof statusBadgeVariants>["tone"] {
  switch (status) {
    case "paid":
      return "success";
    case "partial":
      return "warning";
    case "refunded":
      return "destructive";
    default:
      return "default";
  }
}

function getStockTone(
  status: StockStatus,
): VariantProps<typeof statusBadgeVariants>["tone"] {
  switch (status) {
    case "in_stock":
      return "success";
    case "low_stock":
    case "expiring":
      return "warning";
    case "out_of_stock":
      return "destructive";
    case "not_tracked":
      return "accent";
    default:
      return "default";
  }
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: OrderStatus | PaymentStatus | StockStatus;
  type: "order" | "payment" | "stock";
}

export function StatusBadge({
  status,
  type,
  className,
  ...props
}: StatusBadgeProps) {
  let label: string;
  let tone: VariantProps<typeof statusBadgeVariants>["tone"] = "default";

  if (type === "order") {
    label = ORDER_LABELS[status as OrderStatus];
    tone = getOrderTone(status as OrderStatus);
  } else if (type === "payment") {
    label = PAYMENT_LABELS[status as PaymentStatus];
    tone = getPaymentTone(status as PaymentStatus);
  } else {
    label = STOCK_LABELS[status as StockStatus];
    tone = getStockTone(status as StockStatus);
  }

  return (
    <span
      className={cn(statusBadgeVariants({ variant: type, tone }), className)}
      {...props}
    >
      {label}
    </span>
  );
}
