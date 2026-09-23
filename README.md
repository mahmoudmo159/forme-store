
# FORME — Complete E-commerce Build

This package continues the Phase 1 Supabase foundation and adds a working React storefront, customer auth, account/order history, atomic checkout, inventory validation, COD checkout, admin order/product/customer views, and production-oriented RLS.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Optionally run `supabase/seed.sql`.
4. Copy `.env.example` to `.env` and add the Supabase URL + anon key.
5. `npm install`
6. `npm run build`
7. `npm run dev`

## Admin

Create a user under Supabase Authentication, then insert that user's UUID into `public.admin_users`:

insert into public.admin_users (id,email,full_name,role)
values ('AUTH-USER-UUID','you@example.com','Store Admin','superadmin');

## Important

- Never put a Supabase `service_role` key in Vite/frontend code.
- The checkout is atomic and validates price/stock inside Postgres.
- COD is functional.
- The `card` option is deliberately provider-ready rather than pretending a card was charged. A real gateway (Paymob/Stripe/etc.) needs the merchant credentials and an Edge Function/server endpoint to create and verify payment transactions.
- Replace demo/placeholder policy text and product images before launch.
