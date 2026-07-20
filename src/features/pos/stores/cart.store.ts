import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  getCustomerById,
  getProductById,
  getSettings,
  validateCoupon,
} from "@/lib/data/store";
import {
  calculateOrderTotals,
  resolveUnitPrice,
} from "@/lib/services/pricing.service";
import type { EventType, PaymentMethod, Product } from "@/types";
import { generateId, roundMoney } from "@/lib/utils";

export type PosSaleMode = "walk_in" | "delivery" | "event" | "reservation";
export type PosFulfillmentMode = "pickup" | "delivery";
export type PosPaymentPlan = "full" | "deposit" | "later";

export interface PosSaleContext {
  mode: PosSaleMode;
  fulfillment: PosFulfillmentMode;
  scheduledDate: string;
  scheduledTime: string;
  deliveryAddress: string;
  deliveryFee: number;
  deliveryZone: string;
  deliveryRecipientName: string;
  deliveryPhone: string;
  deliveryInstructions: string;
  eventType: EventType;
  guestCount: number;
  paymentPlan: PosPaymentPlan;
  depositAmount: number;
  notes: string;
}

export const DEFAULT_POS_SALE_CONTEXT: PosSaleContext = {
  mode: "walk_in",
  fulfillment: "pickup",
  scheduledDate: "",
  scheduledTime: "",
  deliveryAddress: "",
  deliveryFee: 0,
  deliveryZone: "",
  deliveryRecipientName: "",
  deliveryPhone: "",
  deliveryInstructions: "",
  eventType: "other",
  guestCount: 1,
  paymentPlan: "full",
  depositAmount: 0,
  notes: "",
};

export interface CartItem {
  id: string;
  productId: string;
  nameAr: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  notes: string;
}

export interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  discountAmount: number;
  couponCode: string | null;
  customerId: string | null;
  saleContext: PosSaleContext;
  heldAt: string;
}

interface CartTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

interface CartState {
  items: CartItem[];
  discountAmount: number;
  couponCode: string | null;
  customerId: string | null;
  saleContext: PosSaleContext;
  heldCarts: HeldCart[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  clear: () => void;
  applyDiscount: (amount: number) => void;
  applyCoupon: (code: string) => boolean;
  setCustomer: (customerId: string | null) => void;
  setSaleContext: (context: PosSaleContext) => void;
  getTotals: () => CartTotals;
  holdCart: (label?: string) => void;
  resumeCart: (heldId: string) => void;
  deleteHeldCart: (heldId: string) => void;
}

function computeTotals(
  items: CartItem[],
  discountAmount: number,
  deliveryFee = 0,
): CartTotals {
  const settings = getSettings();
  return calculateOrderTotals({
    items: items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    })),
    discountAmount,
    deliveryFee,
    taxRate: settings.taxRate,
  });
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discountAmount: 0,
      couponCode: null,
      customerId: null,
      saleContext: { ...DEFAULT_POS_SALE_CONTEXT },
      heldCarts: [],

      addItem: (product, quantity = 1) => {
        set((state) => {
          const customer = state.customerId
            ? getCustomerById(state.customerId)
            : null;
          const unitPrice = resolveUnitPrice(
            product.retailPrice,
            product.wholesalePrice,
            customer?.wholesalePricing ?? false,
          );
          const existing = state.items.find((i) => i.productId === product.id);
          if (existing) {
            const newQty = existing.quantity + quantity;
            return {
              items: state.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: newQty }
                  : i,
              ),
            };
          }
          const item: CartItem = {
            id: generateId(),
            productId: product.id,
            nameAr: product.nameAr,
            sku: product.sku,
            unitPrice,
            quantity,
            discount: 0,
            notes: "",
          };
          return { items: [...state.items, item] };
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i,
          ),
        }));
      },

      updateItemNotes: (itemId, notes) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, notes } : i,
          ),
        }));
      },

      clear: () => {
        set({
          items: [],
          discountAmount: 0,
          couponCode: null,
          customerId: null,
          saleContext: { ...DEFAULT_POS_SALE_CONTEXT },
        });
      },

      applyDiscount: (amount) => {
        set({ discountAmount: roundMoney(Math.max(0, amount)) });
      },

      applyCoupon: (code) => {
        if (!code.trim()) {
          set({ couponCode: null, discountAmount: 0 });
          return true;
        }
        const totals = get().getTotals();
        const coupon = validateCoupon(code, totals.subtotal);
        if (!coupon) return false;

        let discount = 0;
        if (coupon.type === "percentage") {
          discount = roundMoney((totals.subtotal * coupon.value) / 100);
        } else if (coupon.type === "fixed") {
          discount = coupon.value;
        }

        set({ couponCode: coupon.code, discountAmount: discount });
        return true;
      },

      setCustomer: (customerId) => {
        const customer = customerId ? getCustomerById(customerId) : null;
        set((state) => ({
          customerId,
          items: state.items.map((item) => {
            const product = getProductById(item.productId);
            if (!product) return item;
            return {
              ...item,
              unitPrice: resolveUnitPrice(
                product.retailPrice,
                product.wholesalePrice,
                customer?.wholesalePricing ?? false,
              ),
            };
          }),
        }));
      },
      setSaleContext: (saleContext) => set({ saleContext }),

      getTotals: () => {
        const { items, discountAmount, saleContext } = get();
        const delivery =
          saleContext.mode === "delivery" ||
          saleContext.fulfillment === "delivery";
        return computeTotals(
          items,
          discountAmount,
          delivery ? saleContext.deliveryFee ?? 0 : 0,
        );
      },

      holdCart: (label) => {
        const {
          items,
          discountAmount,
          couponCode,
          customerId,
          saleContext,
          heldCarts,
        } = get();
        if (items.length === 0) return;

        const held: HeldCart = {
          id: generateId(),
          label: label ?? `سلة معلّقة ${heldCarts.length + 1}`,
          items: [...items],
          discountAmount,
          couponCode,
          customerId,
          saleContext,
          heldAt: new Date().toISOString(),
        };

        set({
          heldCarts: [held, ...heldCarts],
          items: [],
          discountAmount: 0,
          couponCode: null,
          customerId: null,
          saleContext: { ...DEFAULT_POS_SALE_CONTEXT },
        });
      },

      resumeCart: (heldId) => {
        const { heldCarts } = get();
        const held = heldCarts.find((h) => h.id === heldId);
        if (!held) return;

        set({
          items: held.items,
          discountAmount: held.discountAmount,
          couponCode: held.couponCode,
          customerId: held.customerId ?? null,
          saleContext: {
            ...DEFAULT_POS_SALE_CONTEXT,
            ...(held.saleContext ?? {}),
          },
          heldCarts: heldCarts.filter((h) => h.id !== heldId),
        });
      },

      deleteHeldCart: (heldId) => {
        set((state) => ({
          heldCarts: state.heldCarts.filter((h) => h.id !== heldId),
        }));
      },
    }),
    {
      name: "valentino-cart",
      version: 4,
      partialize: (state) => ({
        items: state.items,
        discountAmount: state.discountAmount,
        couponCode: state.couponCode,
        customerId: state.customerId,
        saleContext: state.saleContext,
        heldCarts: state.heldCarts,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<CartState>;
        const withNotes = (items: CartItem[] = []) =>
          items.map((item) => ({
            ...item,
            notes: item.notes ?? "",
          }));

        if (version < 4) {
          return {
            items: withNotes(state.items ?? []),
            discountAmount: state.discountAmount ?? 0,
            couponCode: state.couponCode ?? null,
            customerId: state.customerId ?? null,
            saleContext: {
              ...DEFAULT_POS_SALE_CONTEXT,
              ...(state.saleContext ?? {}),
            },
            heldCarts: (state.heldCarts ?? []).map((held) => ({
              ...held,
              items: withNotes(held.items ?? []),
              saleContext: {
                ...DEFAULT_POS_SALE_CONTEXT,
                ...(held.saleContext ?? {}),
              },
            })),
          };
        }
        return persisted as CartState;
      },
    },
  ),
);

export type { PaymentMethod };
