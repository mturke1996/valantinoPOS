# Phase 0.3 — Database Schema (ERD)

## Entity Relationship Overview

```
branches ──┬── users (profiles)
           ├── products, categories, customers, orders, ...
           └── settings (per branch)

roles ── role_permissions ── permissions

categories (self-ref parent_id) ── products ──┬── product_variants
                                              ├── product_images
                                              ├── product_units
                                              └── price_tiers

products ── batches ── inventory_movements
         └── stock_counts

customers ──┬── customer_addresses
            ├── loyalty_points_log
            └── orders ──┬── order_items
                         ├── order_status_history
                         ├── events
                         ├── payments
                         └── invoices

orders ── returns ── return_items

suppliers ── purchase_orders ── purchase_order_items
          └── supplier_payments

shifts ── cash_movements

discounts, coupons ── coupon_usages

expense_categories ── expenses

notifications, audit_logs, settings
```

---

## Core Tables (Detailed)

### `branches`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | |
| address | text | |
| phone | text | |
| is_active | boolean | |
| created_at | timestamptz | |

### `profiles` (extends auth.users)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK FK auth.users | |
| branch_id | uuid FK branches | |
| role_id | uuid FK roles | |
| full_name | text | |
| phone | text | |
| avatar_url | text | |
| is_active | boolean | |

### `roles` / `permissions` / `role_permissions`
Standard RBAC. Permissions as `module.action` e.g. `pos.sell`, `orders.update_status`.

### `categories`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| parent_id | uuid FK self | Tree structure |
| name_ar | text | |
| name_en | text | nullable |
| slug | text | |
| sort_order | int | |
| deleted_at | timestamptz | soft delete |

### `products`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| category_id | uuid FK | |
| sku | text UNIQUE per branch | |
| barcode | text | indexed |
| name_ar | text | |
| description | text | |
| cost_price | numeric(12,2) | WAC updated on receive |
| retail_price | numeric(12,2) | |
| wholesale_price | numeric(12,2) | |
| unit_type | enum | piece, gram, kilo, box, carton |
| weight_grams | numeric | for weighted sale |
| origin | text | |
| min_stock | int | reorder alert |
| is_bundle | boolean | gift box |
| is_active | boolean | |
| deleted_at | timestamptz | |

### `product_variants`
Flavor, size, filling — linked to product with own SKU/barcode/stock.

### `product_images`
| Column | Type | Notes |
|--------|------|-------|
| product_id | uuid FK | |
| storage_path | text | Supabase Storage |
| sort_order | int | |
| is_primary | boolean | |

### `batches`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_id | uuid FK | |
| batch_number | text | |
| quantity | numeric | current qty |
| expiry_date | date | FEFO sort key |
| cost_per_unit | numeric | |
| received_at | timestamptz | |

### `inventory_movements` (immutable log)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| product_id | uuid FK | |
| batch_id | uuid FK nullable | |
| type | enum | add, deduct, transfer, waste, expiry, sale, return, adjust |
| quantity | numeric | signed |
| reference_type | text | order, purchase, stock_count |
| reference_id | uuid | |
| notes | text | |
| created_by | uuid FK profiles | |
| created_at | timestamptz | |

### `customers`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| name | text | |
| phone | text indexed | |
| whatsapp | text | |
| email | text nullable | |
| notes | text | |
| birthday | date | annual alert |
| loyalty_tier_id | uuid FK | |
| loyalty_points | int default 0 | |
| total_spent | numeric cached | trigger updated |
| order_count | int cached | |
| last_order_at | timestamptz | |
| wholesale_pricing | boolean | |
| deleted_at | timestamptz | |

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| order_number | text UNIQUE | sequential per branch |
| customer_id | uuid FK nullable | |
| type | enum | pos, event, online |
| status | enum | received, reviewing, preparing, packaging, ready, out_for_delivery, delivered, completed, cancelled |
| subtotal | numeric | |
| discount_amount | numeric | |
| tax_amount | numeric | |
| total | numeric | |
| paid_amount | numeric | deposit support |
| payment_status | enum | unpaid, partial, paid, refunded |
| delivery_date | date | |
| delivery_time | time | |
| delivery_address | text | |
| notes | text | |
| assigned_to | uuid FK profiles | |
| shift_id | uuid FK shifts | POS link |
| created_by | uuid FK | |
| created_at | timestamptz | |
| deleted_at | timestamptz | |

### `order_items`
| Column | Type | Notes |
|--------|------|-------|
| order_id | uuid FK | |
| product_id | uuid FK | |
| variant_id | uuid FK nullable | |
| batch_id | uuid FK nullable | FEFO assigned |
| quantity | numeric | |
| unit_price | numeric | tier at sale time |
| discount | numeric | |
| total | numeric | |
| weight_grams | numeric nullable | weighted items |
| notes | text | |

### `events`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_id | uuid FK | 1:1 |
| event_type | enum | wedding, engagement, birth, success, graduation, birthday, corporate, gift, other |
| guest_count | int | |
| packaging_colors | text[] | |
| gift_card_message | text | |
| gift_card_phrase | text | |
| special_notes | text | |

### `order_status_history`
| Column | Type | Notes |
|--------|------|-------|
| order_id | uuid FK | |
| from_status | enum | |
| to_status | enum | |
| changed_by | uuid FK | |
| changed_at | timestamptz | |
| notes | text | |

### `shifts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| cashier_id | uuid FK profiles | |
| opened_at | timestamptz | |
| closed_at | timestamptz nullable | |
| opening_float | numeric | |
| closing_count | numeric nullable | |
| expected_cash | numeric computed | |
| variance | numeric | |
| status | enum | open, closed | |

### `payments`
| Column | Type | Notes |
|--------|------|-------|
| order_id | uuid FK | |
| method | enum | cash, card, mixed, credit |
| amount | numeric | |
| cash_amount | numeric nullable | |
| card_amount | numeric nullable | |
| reference | text | card ref |
| created_at | timestamptz | |

### `invoices`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_id | uuid FK | |
| invoice_number | text UNIQUE | |
| qr_payload | text | TLV optional |
| printed_at | timestamptz | |

### `loyalty_tiers`
Bronze, Silver, Gold, Platinum, Diamond — min_points, discount_percent, priority.

### `loyalty_points_log`
earn, redeem, adjust — with order_id reference.

### `suppliers` / `purchase_orders` / `purchase_order_items` / `supplier_payments`
Standard procurement cycle with status enum.

### `expenses` / `expense_categories`
Recurring flag, category, amount, date.

### `returns` / `return_items`
Link to order, restock flag, refund method.

### `discounts` / `coupons` / `coupon_usages`
Scheduled, usage limits, min cart.

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid FK | |
| type | enum | order, stock, event, system |
| title | text | |
| body | text | |
| link | text | |
| read_at | timestamptz nullable | |
| channels | text[] | in_app, email, whatsapp, push |

### `audit_logs` (append-only)
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid FK | |
| action | text | |
| entity_type | text | |
| entity_id | uuid | |
| old_values | jsonb | |
| new_values | jsonb | |
| ip_address | inet | |
| user_agent | text | |
| created_at | timestamptz | |

### `settings` (key-value per branch)
tax_rate, currency, logo_url, loyalty_rules, print_templates, etc.

---

## Indexes (Critical)

```sql
-- Products
CREATE INDEX idx_products_branch_barcode ON products(branch_id, barcode) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_branch_sku ON products(branch_id, sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;

-- Orders
CREATE INDEX idx_orders_branch_status ON orders(branch_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_delivery ON orders(branch_id, delivery_date) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_created ON orders(branch_id, created_at DESC);

-- Batches FEFO
CREATE INDEX idx_batches_fefo ON batches(product_id, expiry_date ASC) WHERE quantity > 0;

-- Inventory movements
CREATE INDEX idx_inv_mov_product ON inventory_movements(product_id, created_at DESC);

-- Customers
CREATE INDEX idx_customers_phone ON customers(branch_id, phone) WHERE deleted_at IS NULL;

-- Notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
```

---

## RLS Policy Pattern

```sql
-- Example: products
CREATE POLICY "products_select" ON products FOR SELECT
  USING (branch_id = auth.jwt()->>'branch_id' AND has_permission('products.read'));

CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK (branch_id = auth.jwt()->>'branch_id' AND has_permission('products.create'));
```

Helper functions:
- `get_user_branch_id()` 
- `has_permission(permission text)`
- `get_user_role()`

---

## Triggers

| Trigger | On | Action |
|---------|-----|--------|
| `trg_inventory_on_sale` | order_items INSERT | Deduct batch (FEFO), log movement |
| `trg_inventory_on_return` | return_items INSERT | Add back or waste |
| `trg_loyalty_on_payment` | payments INSERT | Calculate + log points |
| `trg_customer_stats` | orders UPDATE status=completed | Update total_spent, order_count |
| `trg_audit_sensitive` | multiple tables | Insert audit_logs |
| `trg_wac_on_receive` | purchase_order_items | Recalculate product cost_price |

---

## Materialized Views

- `mv_daily_sales` — refresh hourly via pg_cron
- `mv_product_rankings` — top/bottom sellers
- `mv_stock_alerts` — below min_stock + near expiry

---

## Scheduled Jobs (pg_cron)

- Delivery reminders: 7d, 3d, 1d, 2h, 30m before `delivery_date + delivery_time`
- Birthday alerts: daily scan
- Stock expiry warnings: daily
- Refresh materialized views: hourly
