"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BadgePercent,
  Minus,
  Pause,
  Plus,
  Search,
  ShoppingCart,
  Ticket,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CurrencyDisplay } from "@/components/shared/currency-display";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PosChrome } from "@/components/pos/pos-chrome";
import { PosCouponDialog } from "@/components/pos/pos-coupon-dialog";
import { PosCustomerDialog } from "@/components/pos/pos-customer-dialog";
import { PosDiscountDialog } from "@/components/pos/pos-discount-dialog";
import { PosOperationsPanel } from "@/components/pos/pos-operations-panel";
import { PosPaymentDialog } from "@/components/pos/pos-payment-dialog";
import { PosProductTile } from "@/components/pos/pos-product-tile";
import {
  getCollectionAmount,
  POS_SALE_MODE_LABELS,
  PosSaleContextButton,
  PosSaleContextDialog,
} from "@/components/pos/pos-sale-context-dialog";
import { PosSalesActivityPanel } from "@/components/pos/pos-sales-activity-panel";
import { PrintReceipt } from "@/components/pos/print-receipt";
import { useCartStore } from "@/features/pos/stores/cart.store";
import { useStoreSubscription } from "@/hooks/use-store-subscription";
import {
  createOrder,
  deleteOrder,
  getCategories,
  getOpenShift,
  getProducts,
  getSettings,
  getState,
  processPayment,
  refreshSystemReminders,
} from "@/lib/data/store";
import { formatMoneyLabel } from "@/lib/formatters";
import { cacheProducts, getCachedProducts } from "@/lib/offline/db";
import { getAuthSession } from "@/lib/auth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  getPosSalesActivity,
  getPosSessionStats,
  getTodayOperations,
} from "@/lib/services/operations.service";
import { calculateOrderTotals } from "@/lib/services/pricing.service";
import type {
  Order,
  OrderType,
  Payment,
  PaymentMethod,
  Product,
  Shift,
} from "@/types";

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<
    ReturnType<typeof getCategories>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [processing, setProcessing] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [weightGrams, setWeightGrams] = useState("250");
  const searchRef = useRef<HTMLInputElement>(null);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [saleContextOpen, setSaleContextOpen] = useState(false);
  const [salesActivityOpen, setSalesActivityOpen] = useState(false);
  const [returnToSaleContext, setReturnToSaleContext] = useState(false);
  const [todayOperations, setTodayOperations] = useState(() =>
    getTodayOperations(getState()),
  );
  const [sessionStats, setSessionStats] = useState({
    count: 0,
    total: 0,
    lastAt: null as string | null,
  });
  const [salesActivity, setSalesActivity] = useState(() =>
    getPosSalesActivity(getState()),
  );
  const online = useOnlineStatus();

  const refreshSessionStats = useCallback(
    (currentShift: Shift | null) => {
      const state = getState();
      setSessionStats(getPosSessionStats(state, currentShift?.id));
      setSalesActivity(getPosSalesActivity(state, currentShift?.id));
    },
    [],
  );

  const items = useCartStore((s) => s.items);
  const heldCarts = useCartStore((s) => s.heldCarts);
  const customerId = useCartStore((s) => s.customerId);
  const couponCode = useCartStore((s) => s.couponCode);
  const saleContext = useCartStore((s) => s.saleContext);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clear = useCartStore((s) => s.clear);
  const applyDiscount = useCartStore((s) => s.applyDiscount);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const setSaleContext = useCartStore((s) => s.setSaleContext);
  const holdCart = useCartStore((s) => s.holdCart);
  const resumeCart = useCartStore((s) => s.resumeCart);
  const deleteHeldCart = useCartStore((s) => s.deleteHeldCart);

  const settings = getSettings();
  const totals = useMemo(
    () =>
      calculateOrderTotals({
        items: items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        discountAmount,
        taxRate: settings.taxRate,
      }),
    [items, discountAmount, settings.taxRate],
  );
  const deferredSearch = useDeferredValue(search);
  const selectedCustomer = useMemo(
    () =>
      customerId
        ? getState().customers.find((customer) => customer.id === customerId) ??
          null
        : null,
    [customerId],
  );
  const orderType: OrderType =
    saleContext.mode === "walk_in" ? "pos" : saleContext.mode;
  const collectionAmount = getCollectionAmount(saleContext, totals.total);

  const refreshPosData = useCallback(async () => {
    refreshSystemReminders();
    const live = getProducts().filter((p) => p.isActive);
    if (online) {
      await cacheProducts(live);
      setProducts(live);
    } else {
      const cached = await getCachedProducts();
      setProducts(cached.length > 0 ? cached.filter((p) => p.isActive) : live);
    }
    setCategories(getCategories());
    const currentShift = getOpenShift(getSettings().branchId) ?? null;
    setShift(currentShift);
    refreshSessionStats(currentShift);
    setTodayOperations(getTodayOperations(getState()));
    setLoading(false);
  }, [online, refreshSessionStats]);

  useStoreSubscription(() => {
    void refreshPosData();
  });

  const handleProductClick = (product: Product) => {
    if (product.unitType === "gram" || product.unitType === "kilo") {
      setWeightProduct(product);
      setWeightGrams("250");
      return;
    }
    addItem(product);
  };

  const handleWeightAdd = () => {
    if (!weightProduct) return;
    const grams = parseFloat(weightGrams) || 0;
    if (grams <= 0) return;
    const qty =
      weightProduct.unitType === "kilo" ? grams / 1000 : grams / 100;
    addItem(weightProduct, Math.max(0.001, qty));
    setWeightProduct(null);
  };

  const handleBarcodeScan = (code: string) => {
    const product = products.find(
      (p) => p.barcode === code || p.sku === code,
    );
    if (product) {
      handleProductClick(product);
      toast.success(`تمت إضافة: ${product.nameAr}`);
    } else {
      toast.error("منتج غير موجود");
    }
    setSearch("");
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory) {
      list = list.filter((p) => p.categoryId === activeCategory);
    }
    if (deferredSearch.trim()) {
      const q = deferredSearch.trim().toLocaleLowerCase("ar");
      list = list.filter(
        (p) =>
          p.nameAr.toLocaleLowerCase("ar").includes(q) ||
          p.nameEn?.toLocaleLowerCase("en").includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q),
      );
    }
    return list;
  }, [products, activeCategory, deferredSearch]);

  const getCheckoutError = useCallback((): string | null => {
    if (items.length === 0) return "السلة فارغة";
    const requiresShift = saleContext.mode === "walk_in";
    if (requiresShift && !shift) return "افتح الوردية قبل إتمام البيع";
    if (saleContext.mode === "walk_in") return null;
    if (!selectedCustomer) return "اختر عميلاً للطلب المجدول";
    if (!saleContext.scheduledDate || !saleContext.scheduledTime) {
      return "حدد تاريخ ووقت تنفيذ الطلب";
    }
    if (
      (saleContext.mode === "delivery" ||
        saleContext.fulfillment === "delivery") &&
      !saleContext.deliveryAddress.trim()
    ) {
      return "أدخل عنوان التوصيل";
    }
    if (
      saleContext.paymentPlan === "deposit" &&
      (collectionAmount <= 0 || collectionAmount >= totals.total)
    ) {
      return "قيمة العربون يجب أن تكون أقل من إجمالي الطلب";
    }
    return null;
  }, [
    collectionAmount,
    items.length,
    saleContext,
    selectedCustomer,
    shift,
    totals.total,
  ]);

  const placeOrder = useCallback((collectPayment: boolean) => {
    if (items.length === 0) return;
    if (saleContext.mode === "walk_in" && !shift) return;

    const contextError = getCheckoutError();
    if (contextError) {
      toast.error(contextError);
      setSaleContextOpen(true);
      return;
    }

    const parsedCash = Number.parseFloat(cashAmount) || 0;
    const parsedCard = Number.parseFloat(cardAmount) || 0;
    if (
      collectPayment &&
      paymentMethod === "cash" &&
      parsedCash < collectionAmount
    ) {
      toast.error("المبلغ المستلم أقل من المبلغ المطلوب تحصيله");
      return;
    }
    if (
      collectPayment &&
      paymentMethod === "mixed" &&
      Math.abs(parsedCash + parsedCard - collectionAmount) > 0.01
    ) {
      toast.error("مجموع النقد والبطاقة لا يساوي المبلغ المطلوب");
      return;
    }

    const state = getState();
    const authSession = getAuthSession();
    setProcessing(true);
    let createdOrderId: string | null = null;
    try {
      const isDelivery =
        saleContext.mode === "delivery" ||
        saleContext.fulfillment === "delivery";
      const isScheduled = saleContext.mode !== "walk_in";
      const order = createOrder({
        branchId: state.settings.branchId,
        customerId,
        type: orderType,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        discountAmount: totals.discountAmount,
        couponCode: couponCode ?? null,
        deliveryDate: isScheduled ? saleContext.scheduledDate : null,
        deliveryTime: isScheduled ? saleContext.scheduledTime : null,
        deliveryAddress: isDelivery
          ? saleContext.deliveryAddress.trim()
          : isScheduled
            ? "استلام من المتجر"
            : null,
        notes: saleContext.notes || null,
        shiftId: shift?.id ?? null,
        createdBy: authSession?.userId ?? state.users[0]?.id ?? null,
        event: isScheduled
          ? {
              eventType:
                saleContext.mode === "event"
                  ? saleContext.eventType
                  : saleContext.mode === "delivery"
                    ? "gift"
                    : "other",
              guestCount: Math.max(1, saleContext.guestCount || 1),
              packagingColors: [],
              giftCardMessage: null,
              giftCardPhrase: null,
              specialNotes: saleContext.notes || null,
            }
          : undefined,
      });
      createdOrderId = order.id;

      let payment: Payment | null = null;
      if (collectPayment && collectionAmount > 0) {
        try {
          payment = processPayment({
            orderId: order.id,
            shiftId: shift?.id ?? null,
            method: paymentMethod,
            amount: collectionAmount,
            cashAmount:
              paymentMethod === "cash" || paymentMethod === "mixed"
                ? paymentMethod === "mixed"
                  ? parsedCash
                  : collectionAmount
                : null,
            cardAmount:
              paymentMethod === "card" || paymentMethod === "mixed"
                ? paymentMethod === "mixed"
                  ? parsedCard
                  : collectionAmount
                : null,
            reference:
              paymentMethod === "transfer"
                ? transferReference.trim() || null
                : null,
            userId: authSession?.userId ?? state.users[0]?.id ?? null,
          });
        } catch (error) {
          deleteOrder(order.id);
          throw error;
        }
      }

      const savedOrder =
        getState().orders.find((candidate) => candidate.id === order.id) ??
        order;
      setLastOrder(savedOrder);
      setLastPayment(payment);

      const successMessage =
        saleContext.mode === "walk_in"
          ? `تم إتمام البيع — ${order.orderNumber}`
          : payment
            ? `تم إنشاء الطلب وتحصيل ${formatMoneyLabel(payment.amount, state.settings)} — ${order.orderNumber}`
            : `تم تسجيل الطلب للدفع لاحقاً — ${order.orderNumber}`;
      toast.success(successMessage);
      clear();
      setPaymentOpen(false);
      setCartOpen(false);
      setCashAmount("");
      setCardAmount("");
      setTransferReference("");
      refreshSessionStats(shift);
      setTodayOperations(getTodayOperations(getState()));
    } catch (error) {
      if (createdOrderId) {
        setTodayOperations(getTodayOperations(getState()));
      }
      toast.error(error instanceof Error ? error.message : "فشل حفظ الطلب");
    } finally {
      setProcessing(false);
    }
  }, [
    cardAmount,
    cashAmount,
    clear,
    collectionAmount,
    couponCode,
    customerId,
    getCheckoutError,
    items,
    orderType,
    paymentMethod,
    refreshSessionStats,
    saleContext,
    shift,
    totals.discountAmount,
    transferReference,
  ]);

  const startCheckout = useCallback(() => {
    const error = getCheckoutError();
    if (error) {
      toast.error(error);
      if (saleContext.mode !== "walk_in") {
        setSaleContextOpen(true);
      }
      return;
    }
    if (collectionAmount <= 0) {
      void placeOrder(false);
      return;
    }
    setCashAmount(String(collectionAmount));
    setPaymentOpen(true);
  }, [collectionAmount, getCheckoutError, placeOrder, saleContext.mode]);

  const handlePayment = () => {
    void placeOrder(true);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F3") {
        e.preventDefault();
        setCustomerOpen(true);
      }
      if (e.key === "F4" && items.length > 0) {
        e.preventDefault();
        startCheckout();
      }
      if (e.key === "F6" && items.length > 0) {
        e.preventDefault();
        holdCart();
        toast.info("تم تعليق السلة");
      }
      if (e.key === "F7") {
        e.preventDefault();
        setSaleContextOpen(true);
      }
      if (e.key === "F8") {
        e.preventDefault();
        setOperationsOpen(true);
      }
      if (e.key === "F9") {
        e.preventDefault();
        setSalesActivityOpen(true);
      }
      if (e.key === "Escape") {
        setSearch("");
        setPaymentOpen(false);
        setSaleContextOpen(false);
        setSalesActivityOpen(false);
      }
    },
    [items.length, holdCart, startCheckout],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="flex h-full gap-4 p-4">
        <Skeleton className="flex-1" />
        <Skeleton className="w-96" />
      </div>
    );
  }

  return (
    <div className="pos-console flex h-full flex-col overflow-hidden">
      <PosChrome
        online={online}
        shift={shift}
        sessionCount={sessionStats.count}
        sessionTotal={sessionStats.total}
        lastSaleAt={sessionStats.lastAt}
        heldCount={heldCarts.length}
        operationCount={todayOperations.length}
        onHeldOpen={() => setHeldOpen(true)}
        onOperationsOpen={() => setOperationsOpen(true)}
        onSalesActivityOpen={() => setSalesActivityOpen(true)}
        onShiftChange={(next) => {
          setShift(next);
          refreshSessionStats(next);
        }}
      />

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
      {/* Products panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-cacao-800/8 px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  handleBarcodeScan(search.trim());
                }
              }}
              placeholder="بحث بالاسم أو الباركود... (F2)"
              className="ps-9"
            />
          </div>
        </div>

        <ScrollArea className="border-b border-cacao-800/8">
          <div className="flex gap-2 px-4 py-2">
            <Button
              size="sm"
              variant={activeCategory === null ? "default" : "outline"}
              onClick={() => setActiveCategory(null)}
            >
              الكل
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={activeCategory === cat.id ? "default" : "outline"}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.nameAr}
              </Button>
            ))}
          </div>
        </ScrollArea>

        <ScrollArea className="flex-1 p-4">
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="لا توجد منتجات"
              description="جرّب تغيير البحث أو الفئة"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredProducts.map((product) => (
                <PosProductTile
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center gap-4 border-t border-cacao-800/8 px-4 py-2 text-xs text-muted-foreground">
          <span>F2 بحث</span>
          <span className="hidden sm:inline">F3 عميل</span>
          <span>F4 دفع</span>
          <span>F6 تعليق</span>
          <span className="hidden lg:inline">F7 نوع البيع</span>
          <span className="hidden lg:inline">F8 جدول اليوم</span>
          <span className="hidden xl:inline">F9 النشاط</span>
          <span>Esc إلغاء</span>
        </div>
      </div>

      {/* Cart sidebar — desktop */}
      <div className="hidden w-96 shrink-0 flex-col border-s border-cacao-800/8 bg-card md:flex">
        <div className="flex items-center justify-between border-b border-cacao-800/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-5" />
            <span className="font-semibold">السلة</span>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
          {items.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={clear}
              aria-label="تفريغ السلة"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setCustomerOpen(true)}
          className="flex min-h-12 items-center justify-between border-b border-cacao-800/8 px-4 text-start transition-colors hover:bg-cacao-800/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <div className="flex min-w-0 items-center gap-2">
            <UserRound className="size-4 shrink-0 text-gold-400" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">
                {selectedCustomer?.name ?? "عميل نقدي"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {selectedCustomer
                  ? `${selectedCustomer.wholesalePricing ? "سعر جملة · " : ""}${selectedCustomer.loyaltyPoints} نقطة ولاء`
                  : "اضغط لربط عميل"}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">تغيير</span>
        </button>

        <PosSaleContextButton
          value={saleContext}
          customer={selectedCustomer}
          onClick={() => setSaleContextOpen(true)}
        />

        <ScrollArea className="flex-1">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="السلة فارغة"
              description="اختر منتجات لإضافتها"
              className="py-12"
            />
          ) : (
            <div className="space-y-2 p-3">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="border-cacao-800/8 shadow-none"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.nameAr}
                        </p>
                        <CurrencyDisplay
                          amount={item.unitPrice}
                          className="text-xs text-muted-foreground"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => removeItem(item.id)}
                        aria-label={`حذف ${item.nameAr}`}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          aria-label={`تقليل كمية ${item.nameAr}`}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          aria-label={`زيادة كمية ${item.nameAr}`}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <CurrencyDisplay
                        amount={item.unitPrice * item.quantity}
                        className="text-sm font-semibold"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="space-y-3 border-t border-cacao-800/8 p-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <CurrencyDisplay amount={totals.subtotal} />
            </div>
            {totals.discountAmount > 0 ? (
              <div className="flex justify-between text-pistachio-400">
                <span>الخصم</span>
                <span dir="ltr">-{totals.discountAmount.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                الضريبة ({settings.taxRate}%)
              </span>
              <CurrencyDisplay amount={totals.taxAmount} />
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>الإجمالي</span>
              <CurrencyDisplay amount={totals.total} className="text-lg" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              disabled={items.length === 0}
              onClick={() => {
                holdCart();
                toast.info("تم تعليق السلة");
              }}
            >
              <Pause className="size-4" />
              تعليق
            </Button>
            <Button
              variant="outline"
              disabled={items.length === 0}
              onClick={() => setDiscountOpen(true)}
            >
              <BadgePercent className="size-4" />
              خصم
            </Button>
            <Button
              variant="outline"
              disabled={items.length === 0}
              onClick={() => setCouponOpen(true)}
            >
              <Ticket className="size-4" />
              كوبون
            </Button>
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            disabled={items.length === 0}
            onClick={startCheckout}
          >
            <Wallet className="size-4" />
            {collectionAmount > 0 ? (
              <>
                {saleContext.mode === "walk_in" ? "إتمام الدفع" : "تحصيل الآن"}
                <CurrencyDisplay amount={collectionAmount} />
              </>
            ) : (
              "تسجيل الطلب للدفع لاحقاً"
            )}
            <span className="text-xs opacity-70">(F4)</span>
          </Button>
        </div>
      </div>
      </div>

      {/* Mobile cart bar */}
      <div className="flex items-center justify-between gap-3 border-t border-cacao-800/10 bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <Button
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart className="size-4" />
          السلة ({items.length})
        </Button>
        <CurrencyDisplay amount={totals.total} className="font-semibold" />
        <Button
          className="min-h-11 min-w-20"
          disabled={items.length === 0}
          onClick={startCheckout}
        >
          {collectionAmount > 0 ? "دفع" : "تسجيل"}
        </Button>
      </div>

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60">
            <DialogTitle>السلة ({items.length})</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3 py-4">
          <button
            type="button"
            onClick={() => {
              setCartOpen(false);
              setCustomerOpen(true);
            }}
            className="flex min-h-12 items-center justify-between rounded-lg border border-cacao-800/8 px-3 text-start"
          >
            <span className="flex items-center gap-2 text-sm">
              <UserRound className="size-4 text-gold-400" />
              {selectedCustomer?.name ?? "عميل نقدي"}
            </span>
            <span className="text-xs text-muted-foreground">تغيير</span>
          </button>
          <PosSaleContextButton
            value={saleContext}
            customer={selectedCustomer}
            onClick={() => {
              setCartOpen(false);
              setSaleContextOpen(true);
            }}
            className="rounded-lg border border-cacao-800/10"
          />
          {items.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="السلة فارغة"
                description="اختر منتجات لإضافتها"
              />
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.id} className="border-cacao-800/8 shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{item.nameAr}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11"
                          onClick={() => removeItem(item.id)}
                          aria-label={`حذف ${item.nameAr}`}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-11"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            aria-label={`تقليل كمية ${item.nameAr}`}
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span className="w-10 text-center text-base tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-11"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            aria-label={`زيادة كمية ${item.nameAr}`}
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>
                        <CurrencyDisplay
                          amount={item.unitPrice * item.quantity}
                          className="text-sm font-semibold"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogBody>
          <div className="flex shrink-0 items-center justify-between border-t border-cacao-800/8 px-4 pt-3 sm:px-6">
            <span className="text-sm text-muted-foreground">الإجمالي</span>
            <CurrencyDisplay
              amount={totals.total}
              className="text-lg font-semibold"
            />
          </div>
          <DialogFooter className="grid grid-cols-[auto_1fr] gap-2 sm:grid">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={items.length === 0}
              onClick={() => {
                setCartOpen(false);
                setDiscountOpen(true);
              }}
              aria-label="إضافة خصم"
            >
              <BadgePercent className="size-4" />
            </Button>
            <Button
              className="min-h-11 w-full"
              disabled={items.length === 0}
              onClick={() => {
                setCartOpen(false);
                startCheckout();
              }}
            >
              {collectionAmount > 0 ? "متابعة التحصيل" : "تسجيل الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PosCustomerDialog
        open={customerOpen}
        onOpenChange={(open) => {
          setCustomerOpen(open);
          if (!open && returnToSaleContext) {
            setReturnToSaleContext(false);
            setSaleContextOpen(true);
          }
        }}
        selectedId={customerId}
        onSelect={setCustomer}
      />

      <PosSaleContextDialog
        open={saleContextOpen}
        onOpenChange={setSaleContextOpen}
        value={saleContext}
        customer={selectedCustomer}
        total={totals.total}
        onChooseCustomer={(draft) => {
          setSaleContext(draft);
          setSaleContextOpen(false);
          setReturnToSaleContext(true);
          setCustomerOpen(true);
        }}
        onSave={setSaleContext}
      />

      <PosSalesActivityPanel
        open={salesActivityOpen}
        onOpenChange={setSalesActivityOpen}
        activity={salesActivity}
        hasOpenShift={Boolean(shift)}
      />

      <PosDiscountDialog
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        subtotal={totals.subtotal}
        currentDiscount={totals.discountAmount}
        customerId={customerId}
        onApply={applyDiscount}
      />

      <PosCouponDialog
        open={couponOpen}
        onOpenChange={setCouponOpen}
        subtotal={totals.subtotal}
        currentCode={couponCode}
        onApply={(code) => applyCoupon(code)}
      />

      <PosOperationsPanel
        open={operationsOpen}
        onOpenChange={setOperationsOpen}
        items={todayOperations}
        shiftId={shift?.id ?? null}
        onSettled={() => {
          setTodayOperations(getTodayOperations(getState()));
          refreshSessionStats(shift);
        }}
      />

      <PosPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={collectionAmount}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        cashAmount={cashAmount}
        onCashAmountChange={setCashAmount}
        cardAmount={cardAmount}
        onCardAmountChange={setCardAmount}
        transferReference={transferReference}
        onTransferReferenceChange={setTransferReference}
        processing={processing}
        onConfirm={handlePayment}
        title={
          saleContext.mode === "walk_in"
            ? "إتمام الدفع"
            : saleContext.paymentPlan === "deposit"
              ? "تحصيل العربون"
              : "تحصيل الطلب المجدول"
        }
      />

      {/* Held carts modal */}
      <Dialog open={heldOpen} onOpenChange={setHeldOpen}>
        <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>السلات المعلّقة ({heldCarts.length})</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2 pr-1">
            {heldCarts.length === 0 ? (
              <EmptyState
                icon={Pause}
                title="لا توجد سلات معلّقة"
                description="علّق السلة الحالية من شريط الأدوات"
              />
            ) : (
              heldCarts.map((held) => (
              <div
                key={held.id}
                className="flex items-center justify-between rounded-md border border-cacao-800/10 p-3"
              >
                <div>
                  <p className="font-medium">{held.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {held.items.length} منتج ·{" "}
                    {POS_SALE_MODE_LABELS[
                      held.saleContext?.mode ?? "walk_in"
                    ]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      resumeCart(held.id);
                      setHeldOpen(false);
                      toast.success("تم استئناف السلة");
                    }}
                  >
                    استئناف
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteHeldCart(held.id)}
                    aria-label={`حذف ${held.label}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              ))
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Weight input */}
      <Dialog
        open={!!weightProduct}
        onOpenChange={(o) => !o && setWeightProduct(null)}
      >
        <DialogContent className="flex max-h-[min(94dvh,100svh)] flex-col overflow-hidden p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border/60">
            <DialogTitle>البيع بالوزن</DialogTitle>
          </DialogHeader>
          {weightProduct ? (
            <DialogBody className="space-y-4 py-4">
              <p className="text-sm font-medium">{weightProduct.nameAr}</p>
              <div className="space-y-2">
                <label className="text-sm">الوزن (غرام)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  dir="ltr"
                  className="min-h-11 text-base"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                السعر:{" "}
                <CurrencyDisplay
                  amount={
                    (parseFloat(weightGrams) || 0) *
                    (weightProduct.retailPrice /
                      (weightProduct.unitType === "kilo" ? 1000 : 100))
                  }
                />
              </p>
            </DialogBody>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setWeightProduct(null)}
            >
              إلغاء
            </Button>
            <Button className="min-h-11 w-full sm:w-auto" onClick={handleWeightAdd}>
              إضافة للسلة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lastOrder ? (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] start-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-lg border border-cacao-800/10 bg-card p-3 shadow-lg no-print md:bottom-4 md:start-4">
          <span className="truncate text-sm">آخر فاتورة: {lastOrder.orderNumber}</span>
          <PrintReceipt
            order={lastOrder}
            payment={lastPayment}
            taxRate={settings.taxRate}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            onClick={() => setLastOrder(null)}
            aria-label="إخفاء آخر فاتورة"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
