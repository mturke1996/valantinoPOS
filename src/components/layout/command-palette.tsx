"use client";

import { Command } from "cmdk";
import {
  FileText,
  Package,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getNavItemsForRole,
  type UserRole,
} from "@/config/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getState } from "@/lib/data/store";

export interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userRole?: UserRole;
}

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  href: string;
  group: "pages" | "products" | "customers" | "orders";
}

const GROUP_LABELS: Record<SearchResult["group"], string> = {
  pages: "الصفحات",
  products: "المنتجات",
  customers: "العملاء",
  orders: "الطلبات",
};

const GROUP_ICONS: Record<SearchResult["group"], typeof Search> = {
  pages: FileText,
  products: Package,
  customers: Users,
  orders: ShoppingCart,
};

export function CommandPalette({
  open: controlledOpen,
  onOpenChange,
  userRole,
}: CommandPaletteProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const pageResults = useMemo<SearchResult[]>(
    () =>
      getNavItemsForRole(userRole).map((item) => ({
        id: item.href,
        label: item.label,
        href: item.href,
        group: "pages" as const,
      })),
    [userRole],
  );

  const allResults = useMemo(() => {
    const state = getState();
    const productResults: SearchResult[] = state.products
      .filter((product) => product.isActive && !product.deletedAt)
      .slice(0, 20)
      .map((product) => ({
        id: product.id,
        label: product.nameAr,
        description: `SKU: ${product.sku}`,
        href: `/products?search=${encodeURIComponent(product.sku)}`,
        group: "products" as const,
      }));
    const customerResults: SearchResult[] = state.customers
      .filter((customer) => !customer.deletedAt)
      .slice(0, 20)
      .map((customer) => ({
        id: customer.id,
        label: customer.name,
        description: customer.phone ?? undefined,
        href: `/customers?search=${encodeURIComponent(customer.name)}`,
        group: "customers" as const,
      }));
    const orderResults: SearchResult[] = state.orders
      .filter((order) => !order.deletedAt)
      .slice(0, 20)
      .map((order) => ({
        id: order.id,
        label: order.orderNumber,
        description: order.deliveryAddress ?? order.type,
        href: `/orders?highlight=${order.id}`,
        group: "orders" as const,
      }));

    return [
      ...pageResults,
      ...productResults,
      ...customerResults,
      ...orderResults,
    ];
  }, [pageResults]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-none sm:max-w-xl">
        <DialogTitle className="sr-only">بحث سريع</DialogTitle>
        <Command
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          filter={(value, search) => {
            if (!search) return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <div className="flex items-center gap-2 border-b border-cacao-800/8 px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="ابحث عن صفحات، منتجات، عملاء، طلبات..."
              aria-label="بحث سريع في النظام"
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              لا توجد نتائج
            </Command.Empty>

            {(["pages", "products", "customers", "orders"] as const).map(
              (group) => {
                const items = allResults.filter((item) => item.group === group);
                if (items.length === 0) return null;

                const Icon = GROUP_ICONS[group];

                return (
                  <Command.Group
                    key={group}
                    heading={GROUP_LABELS[group]}
                    className="[&_[cmdk-group]]:px-1"
                  >
                    {items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.description ?? ""} ${item.href}`}
                        onSelect={() => handleSelect(item.href)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none",
                          "aria-selected:bg-cacao-800/[0.06] aria-selected:text-cacao-800 dark:aria-selected:bg-cacao-800/40 dark:aria-selected:text-cream-50",
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.label}</p>
                          {item.description ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              },
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
