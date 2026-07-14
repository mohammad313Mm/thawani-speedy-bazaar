## Plan: Advertisements, Delivery Areas, Products, and Commissions

Build out the remaining admin systems in four coordinated phases.

### 1. Database (single migration)

New tables in `public`, each with GRANTs, RLS, and policies:

- **advertisements**: `id, title, image_url, link_url, position (home_top|home_middle|category), category, is_active, sort_order, starts_at, ends_at, created_at`.
  - Public `SELECT` for active ads; admin writes via service-role server fns.
- **delivery_areas**: `id, name_ar, name_en, city, fee_iqd (int), min_order_iqd, is_active, created_at`.
  - Public `SELECT` for active areas; admin writes.
- **products**: `id, store_id (fk stores), name_ar, description, price_iqd, image_url, is_available, sort_order, created_at, updated_at`.
  - Public `SELECT` where `is_available`; merchant owner (via stores.owner_id) can CRUD their own; admin full.
- **stores** additions: `commission_rate numeric(5,2) default 15.00`, `logo_url`, `is_active`.
- **driver_delivery_areas** join: `driver_id, area_id` (assign areas to drivers).

Storage buckets (public):
- `ads` — advertisement images
- `products` — product images
- `store-logos` — store logos

### 2. Server functions (`src/lib/admin.functions.ts` additions + new files)

All gated by admin-session check (existing `verifyAdmin` pattern using service role):

- `listAds / createAd / updateAd / deleteAd / toggleAd`
- `listDeliveryAreas / createDeliveryArea / updateDeliveryArea / deleteDeliveryArea`
- `assignDriverAreas / listDriverAreas`
- `listStores / createStore / updateStore / deleteStore / toggleStoreStatus / setStoreCommission`
- `listProducts(storeId) / createProduct / updateProduct / deleteProduct / toggleProductAvailability`

### 3. Image compression utility

`src/lib/image-compress.ts`: canvas-based client-side compression (max 1200px, JPEG q=0.8, <300KB target) → upload to Supabase Storage → return public URL. Used in Ads, Products, Store Logos.

### 4. Admin Dashboard UI (`src/routes/admin.tsx`)

Add tabs / sections:

- **الإعلانات** — grid of ads, create/edit dialog with image upload, position/category selector, active toggle, sort order.
- **المتاجر** — list with logo, name, category, commission %, active toggle, edit dialog (name, category, commission, logo), delete. "المنتجات" button opens store's product manager.
- **المنتجات** (per store) — grid; add/edit dialog with name, price IQD, description, image (compressed), availability toggle.
- **مناطق التوصيل** — CRUD list of areas + fees; assign areas to drivers via multi-select.
- **السائقون** — extend existing driver management with area assignment.

### 5. Home banners wired to `advertisements`

`BannerCarousel` fetches active ads with `position='home_top'` instead of static content.

### Technical Notes

- Storage compression happens in the browser before upload (canvas + `toBlob`).
- Merchant dashboard product CRUD reuses the same product server fns, scoped by `stores.owner_id = auth.uid()`.
- All admin writes route through service-role server fns to bypass RLS safely, gated by the admin phone/password session flag verified server-side via a shared admin token stored in `sessionStorage` + server env `ADMIN_SECRET` (added as a secret).

### Rollout order (single response, parallel where possible)

1. Migration + storage buckets
2. Image compression util + server fns
3. Admin UI tabs
4. Wire BannerCarousel to ads table
