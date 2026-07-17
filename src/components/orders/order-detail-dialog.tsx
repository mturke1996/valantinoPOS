"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  Loader2,
  MapPin,
  MoreHorizontal,
  ReceiptText,
  Truck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DeliveryReceiptDialog } from "@/components/documents/delivery-receipt-dialog";
import { InvoicePrintDialog } from "@/components/invoices/invoice-print-dialog";
import { WhatsAppOrderShareButton } from "@/components/orders/whatsapp-order-share-button";
import { ChocolateBarProgress } from "@/components/signature/chocolate-bar-progress";
import type { OrderPipelineStage } from "@/components/signature/chocolate-bar-progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  getNextOrderStatus,
  getOrderStatusConfig,
} from "@/lib/constants/order-status";
import {
  cancelOrder,
  ensureInvoiceForOrder,
  getOpenShift,
  getSettings,
  getState,
  processPayment,
  updateOrderStatus,
} from "@/lib/data/store";
import { getAuthSession } from "@/lib/auth";
import { formatMoneyLabel } from "@/lib/formatters";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { Invoice, Order, OrderStatus } from "@/types";

const ORDER_TYPE_LABELS: Record<Order["type"], string> = {
  pos: "بيع فوري",
  delivery: "توصيل",
  event: "مناسبة",
  reservation: "حجز",
  online: "إلكتروني",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "زفاف",
  engagement: "خطوبة",
  birth: "مواليد",
  success: "نجاح",
  graduation: "تخرج",
  birthday: "عيد ميلاد",
  corporate: "شركات",
  gift: "هدية",
  other: "أخرى",
};

interface OrderDetailDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

function toPipelineStage(status: OrderStatus): OrderPipelineStage {
  return status === "cancelled" ? "received" : status;
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onUpdated,
}: OrderDetailDialogProps) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<Invoice | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  if (!order) return null;

  const isManager = getAuthSession()?.role === "admin";
  const isTerminal = order.status === "cancelled" || order.status === "completed";

  const state = getState();
  const customer = order.customerId
    ? state.customers.find((item) => item.id === order.customerId)
    : null;
  const event = state.events.find((item) => item.orderId === order.id);
  const nextStatus = getNextOrderStatus(order.status);
  const nextConfig = nextStatus ? getOrderStatusConfig(nextStatus) : null;
  const balance = Math.max(0, order.total - order.paidAmount);
  const paidRatio =
    order.total > 0 ? Math.min(100, (order.paidAmount / order.total) * 100) : 0;

  const advanceOrder = () => {
    if (!nextStatus) return;
    try {
      updateOrderStatus(order.id, nextStatus);
      toast.success(`تم نقل الطلب إلى ${nextConfig?.labelAr ?? nextStatus}`);
      onUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث حالة الطلب",
      );
    }
  };

  const collectBalance = () => {
    if (balance <= 0) return;
    try {
      const settings = getSettings();
      const session = getAuthSession();
      processPayment({
        orderId: order.id,
        shiftId: getOpenShift(settings.branchId)?.id ?? order.shiftId ?? null,
        method: "cash",
        amount: balance,
        cashAmount: balance,
        userId: session?.userId ?? null,
      });
      toast.success(`تم تحصيل ${formatMoneyLabel(balance, settings)}`);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل التحصيل");
    }
  };

  const openInvoice = () => {
    try {
      setInvoiceTarget(ensureInvoiceForOrder(order.id));
      onOpenChange(false);
      setInvoiceOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر فتح الفاتورة");
    }
  };

  const confirmCancel = () => {
    setCancelling(true);
    try {
      const updated = cancelOrder(order.id);
      if (!updated) throw new Error("تعذر إلغاء الطلب");
      toast.success("تم إلغاء الطلب");
      setConfirmCancelOpen(false);
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل إلغاء الطلب");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-cacao-800/8">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {order.orderNumber}
            <StatusBadge status={order.status} type="order" />
            <Badge variant="outline">{ORDER_TYPE_LABELS[order.type]}</Badge>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5 py-5">
            <ChocolateBarProgress
              currentStage={toPipelineStage(order.status)}
              size="md"
              showLabels
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-cacao-800/[0.035] p-3">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserRound className="size-3.5" />
                  العميل
                </p>
                <p className="mt-1 text-sm font-medium">
                  {customer?.name ?? "عميل نقدي"}
                </p>
                {customer?.phone ? (
                  <p dir="ltr" className="mt-0.5 text-end text-xs text-muted-foreground">
                    {customer.phone}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg bg-cacao-800/[0.035] p-3">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  الموعد
                </p>
                <p className="mt-1 text-sm font-medium">
                  {order.deliveryDate
                    ? formatDate(order.deliveryDate, "dd MMM yyyy")
                    : "بيع فوري"}
                  {order.deliveryTime ? ` · ${order.deliveryTime}` : ""}
                </p>
                {order.deliveryAddress ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {order.deliveryAddress}
                  </p>
                ) : null}
              </div>
            </div>

            {order.deliveryAddress ? (
              <section className="space-y-3 rounded-xl border border-pistachio-400/20 bg-pistachio-400/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="size-4 text-pistachio-400" />
                    بطاقة التوصيل
                  </h3>
                  {order.deliveryFee > 0 ? (
                    <Badge variant="outline">
                      توصيل <CurrencyDisplay amount={order.deliveryFee} />
                    </Badge>
                  ) : (
                    <Badge variant="secondary">توصيل مجاني</Badge>
                  )}
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">المستلم</p>
                    <p className="mt-1 font-medium">
                      {order.deliveryRecipientName ?? customer?.name ?? "—"}
                    </p>
                    {(order.deliveryPhone ?? customer?.phone) ? (
                      <p
                        dir="ltr"
                        className="mt-0.5 text-end text-xs text-muted-foreground"
                      >
                        {order.deliveryPhone ?? customer?.phone}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المنطقة والعنوان</p>
                    <p className="mt-1">
                      {order.deliveryZone ? `${order.deliveryZone} · ` : ""}
                      {order.deliveryAddress}
                    </p>
                  </div>
                </div>
                {order.deliveryInstructions ? (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      تعليمات التسليم
                    </p>
                    <p className="mt-1 text-sm">{order.deliveryInstructions}</p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {event ? (
              <div className="space-y-3 rounded-xl border border-gold-400/15 bg-gold-400/[0.05] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {order.type === "delivery"
                        ? "تفاصيل التوصيل"
                        : order.type === "reservation"
                          ? "تفاصيل الحجز"
                          : "تفاصيل المناسبة"}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                      {" · "}
                      {formatNumber(event.guestCount)} ضيف/قطعة
                    </p>
                  </div>
                  {event.giftCardMessage ? (
                    <div>
                      <p className="text-xs text-muted-foreground">بطاقة الإهداء</p>
                      <p className="mt-1 text-sm">{event.giftCardMessage}</p>
                    </div>
                  ) : null}
                  {event.giftCardPhrase ? (
                    <div>
                      <p className="text-xs text-muted-foreground">عبارة البطاقة</p>
                      <p className="mt-1 text-sm">{event.giftCardPhrase}</p>
                    </div>
                  ) : null}
                </div>
                {event.packagingColors.length > 0 ? (
                  <div>
                    <p className="text-xs text-muted-foreground">ألوان التغليف</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {event.packagingColors.map((color) => {
                        const isHex = color.startsWith("#");
                        return (
                          <span
                            key={color}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border border-black/10 px-2 py-1 text-xs",
                              !isHex && "bg-cacao-800/5",
                            )}
                            title={color}
                          >
                            {isHex ? (
                              <span
                                className="size-3.5 rounded-sm border border-black/10"
                                style={{ backgroundColor: color }}
                              />
                            ) : null}
                            {color}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {event.specialNotes ? (
                  <div>
                    <p className="text-xs text-muted-foreground">ملاحظات المناسبة</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.specialNotes}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">محتويات الطلب</h3>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(order.items.length)} أصناف ·{" "}
                  {formatNumber(
                    order.items.reduce((sum, item) => sum + item.quantity, 0),
                  )}{" "}
                  قطعة
                </p>
              </div>
              <div className="divide-y divide-cacao-800/8 rounded-xl border border-cacao-800/8">
                {(order.items.length > 8
                  ? order.items.slice(0, 6)
                  : order.items
                ).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.productNameAr}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(item.quantity)} ×{" "}
                        <CurrencyDisplay amount={item.unitPrice} />
                      </p>
                    </div>
                    <CurrencyDisplay
                      amount={item.total}
                      className="shrink-0 text-sm font-semibold"
                    />
                  </div>
                ))}
                {order.items.length > 8 ? (
                  <details className="group">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gold-500 marker:content-none [&::-webkit-details-marker]:hidden">
                      عرض باقي الأصناف (
                      {formatNumber(order.items.length - 6)})
                    </summary>
                    <div className="divide-y divide-cacao-800/8 border-t border-cacao-800/8">
                      {order.items.slice(6).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.productNameAr}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(item.quantity)} ×{" "}
                              <CurrencyDisplay amount={item.unitPrice} />
                            </p>
                          </div>
                          <CurrencyDisplay
                            amount={item.total}
                            className="shrink-0 text-sm font-semibold"
                          />
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-cacao-800/8 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <CurrencyDisplay amount={order.subtotal} />
                </div>
                {order.discountAmount > 0 ? (
                  <div className="flex justify-between text-pistachio-400">
                    <span>الخصم</span>
                    <CurrencyDisplay amount={-order.discountAmount} />
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الضريبة</span>
                  <CurrencyDisplay amount={order.taxAmount} />
                </div>
                {order.deliveryFee > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التوصيل</span>
                    <CurrencyDisplay amount={order.deliveryFee} />
                  </div>
                ) : null}
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>الإجمالي</span>
                  <CurrencyDisplay amount={order.total} />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    المدفوع{" "}
                    <CurrencyDisplay
                      amount={order.paidAmount}
                      className="inline text-xs"
                    />
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      balance > 0 ? "text-caramel-500" : "text-pistachio-400",
                    )}
                  >
                    {balance > 0 ? (
                      <>
                        متبقي{" "}
                        <CurrencyDisplay
                          amount={balance}
                          className="inline text-xs"
                        />
                      </>
                    ) : (
                      "مدفوع بالكامل"
                    )}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cacao-800/8">
                  <div
                    className="h-full rounded-full bg-gold-400 transition-[width] duration-300"
                    style={{ width: `${paidRatio}%` }}
                  />
                </div>
              </div>
            </section>

            {order.notes ? (
              <section>
                <h3 className="text-sm font-semibold">الملاحظات</h3>
                <p className="mt-2 rounded-lg bg-cacao-800/[0.035] p-3 text-sm text-muted-foreground">
                  {order.notes}
                </p>
              </section>
            ) : null}
        </DialogBody>

        <DialogFooter className="flex-col gap-3 border-t border-cacao-800/8 bg-card px-4 py-3 sm:flex-col sm:items-stretch sm:px-6 sm:py-4">
          {nextStatus ? (
            <Button className="min-h-11 w-full gap-1.5" onClick={advanceOrder}>
              <ArrowLeft className="size-4" />
              نقل إلى {nextConfig?.labelAr ?? nextStatus}
            </Button>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
            {balance > 0 && !isTerminal ? (
              <Button
                variant="outline"
                className="min-h-11 w-full"
                onClick={collectBalance}
              >
                <Wallet className="size-4" />
                تحصيل المتبقي
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="min-h-11 w-full"
              onClick={openInvoice}
            >
              <ReceiptText className="size-4" />
              فاتورة
            </Button>
            <WhatsAppOrderShareButton
              order={order}
              variant="outline"
              className="min-h-11 w-full border-pistachio-400/40 text-pistachio-400 hover:bg-pistachio-400/10"
              label="واتساب"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="min-h-11 w-full gap-1.5 text-muted-foreground"
                >
                  <MoreHorizontal className="size-4" />
                  المزيد
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                {order.deliveryDate ||
                order.deliveryAddress ||
                order.type === "delivery" ? (
                  <DropdownMenuItem onClick={() => setDeliveryOpen(true)}>
                    <Truck className="size-4" />
                    واصل استلام
                  </DropdownMenuItem>
                ) : null}
                {isManager && !isTerminal ? (
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => setConfirmCancelOpen(true)}
                  >
                    <Ban className="size-4" />
                    إلغاء الطلبيه
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onOpenChange(false)}>
                  <X className="size-4" />
                  إغلاق
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogFooter>
      </DialogContent>
      </Dialog>
      {invoiceTarget ? (
        <InvoicePrintDialog
          open={invoiceOpen}
          onOpenChange={(nextOpen) => {
            setInvoiceOpen(nextOpen);
            if (!nextOpen) setInvoiceTarget(null);
          }}
          invoice={invoiceTarget}
          order={order}
        />
      ) : null}
      <DeliveryReceiptDialog
        open={deliveryOpen}
        onOpenChange={setDeliveryOpen}
        order={order}
      />
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="size-5 text-destructive" />
              تأكيد إلغاء الطلب
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="py-4 text-sm text-muted-foreground">
            سيتم إلغاء الطلب «{order.orderNumber}» وتصنيفه كملغي. يبقى الطلب
            محفوظاً في النظام ويمكن مراجعته من تبويب «ملغاة/مرتجعة».
          </DialogBody>
          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setConfirmCancelOpen(false)}
              disabled={cancelling}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                "تأكيد الإلغاء"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
