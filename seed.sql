-- ============================================================
-- FORME — OPTIONAL SEED / DEMO DATA
-- Run AFTER schema.sql. Safe to skip entirely in production —
-- nothing here is required for the app to function.
-- Re-running is safe (upserts on slug/email/order_number).
-- ============================================================

insert into public.products (name, slug, description, price, compare_at_price, category, stock, sku, main_image, status, featured)
values
  ('Wide Tee', 'wide-tee', 'A relaxed, structured tee cut from heavyweight cotton.', 48, null, 'T-Shirts', 40, 'FORME-TEE-001', null, 'active', true),
  ('Sculpted Tee', 'sculpted-tee', 'A fitted silhouette with a clean neckline.', 52, null, 'T-Shirts', 35, 'FORME-TEE-002', null, 'active', false),
  ('Structured Overshirt', 'structured-overshirt', 'Mid-weight cotton twill, built to layer.', 128, 150, 'Shirts', 22, 'FORME-SHT-001', null, 'active', true),
  ('Fluid Shirt', 'fluid-shirt', 'Soft drape, mother-of-pearl buttons.', 118, null, 'Shirts', 18, 'FORME-SHT-002', null, 'active', false),
  ('Heavy Hoodie', 'heavy-hoodie', '480gsm fleece, brushed interior.', 145, null, 'Hoodies', 30, 'FORME-HD-001', null, 'active', true),
  ('Wool Field Jacket', 'wool-field-jacket', 'Italian wool blend, storm flap.', 340, 380, 'Jackets', 10, 'FORME-JKT-001', null, 'active', true),
  ('Raw Denim', 'raw-denim', '14oz Japanese selvedge.', 210, null, 'Denim', 25, 'FORME-DNM-001', null, 'active', false),
  ('Relaxed Trouser', 'relaxed-trouser', 'Wide leg, mid-rise, wool-cotton blend.', 165, null, 'Pants', 20, 'FORME-PNT-001', null, 'active', false),
  ('Canvas Tote', 'canvas-tote', 'Heavyweight canvas, leather handles.', 78, null, 'Accessories', 50, 'FORME-ACC-001', null, 'active', false),
  ('Leather Belt', 'leather-belt', 'Full-grain leather, brass buckle.', 95, null, 'Accessories', 40, 'FORME-ACC-002', null, 'active', false)
on conflict (slug) do nothing;

-- Variants for a couple of products (sizes)
insert into public.product_variants (product_id, name, value, stock, sku)
select id, 'Size', v.size, 10, sku || '-' || v.size
from public.products, (values ('XS'),('S'),('M'),('L'),('XL')) as v(size)
where slug = 'wide-tee'
on conflict do nothing;

insert into public.product_variants (product_id, name, value, stock, sku)
select id, 'Size', v.size, 8, sku || '-' || v.size
from public.products, (values ('S'),('M'),('L'),('XL')) as v(size)
where slug = 'heavy-hoodie'
on conflict do nothing;

-- Demo customers
insert into public.customers (name, email, phone, address)
values
  ('Ava Whitfield', 'ava.whitfield@example.com', '+1 555 0101', '{"city":"Portland","country":"USA"}'),
  ('Marcus Lee', 'marcus.lee@example.com', '+1 555 0102', '{"city":"Austin","country":"USA"}'),
  ('Ines Moreau', 'ines.moreau@example.com', '+33 6 55 01 03', '{"city":"Lyon","country":"France"}')
on conflict (email) do nothing;

-- Demo orders (each references a demo customer + a real product for order_items)
do $$
declare
  cust_id uuid;
  prod_id uuid;
  ord_id uuid;
begin
  select id into cust_id from public.customers where email = 'ava.whitfield@example.com';
  select id, price into prod_id from public.products where slug = 'wide-tee';

  insert into public.orders (order_number, customer_id, customer_name, customer_email, customer_phone,
    shipping_address, subtotal, shipping_cost, total, payment_method, payment_status, order_status)
  values (public.generate_order_number(), cust_id, 'Ava Whitfield', 'ava.whitfield@example.com', '+1 555 0101',
    '{"address":"123 Pine St","city":"Portland","country":"USA","postal":"97201"}', 48, 0, 48, 'cod', 'pending', 'new')
  returning id into ord_id;

  insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, total, variant)
  values (ord_id, prod_id, 'Wide Tee', 1, 48, 48, 'M');
end $$;
