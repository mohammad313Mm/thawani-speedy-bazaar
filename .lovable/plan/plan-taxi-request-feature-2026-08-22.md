## Plan: Taxi Request Feature

Add a self-contained taxi request flow to the customer home screen.

### 1. Home category

- Extend `CategoryKey` in `src/lib/data.ts` with `"taxi"`.
- Add a new category entry: name `"تكسي"`, icon `🚕`, gradient color.
- Update `src/components/CategoryCard.tsx` to link `"taxi"` to `/taxi` (same pattern as freelance).
- Update search results fallback in `src/routes/index.tsx` so the taxi category routes correctly.

### 2. Taxi request route

- Create `src/routes/taxi.tsx`:
  - Sticky header with back button, title "تكسي", subtitle "اطلب سيارة أجرة".
  - Location card reusing `useLocationPicker` (button "تحديد موقعي").
  - Notes textarea with placeholder `"ملاحظة اختيارية..."`.
  - Name (optional) and phone inputs.
  - Primary button `"اطلب الآن"`.
  - On submit: validate location + phone, call server function, then show toast `"سيتم الاتصال بك قريبا"`.

### 3. Backend server function

- Create `src/lib/taxi.functions.ts`:
  - `placeTaxiRequest` server function (POST, Zod input).
  - Creates/uses a virtual store named `"تكسي"`.
  - Inserts a `customer_orders` row with `status: "searching_driver"`.
  - Fan-out FCM push notifications to drivers with taxi details.

### 4. Validation

- Build/typecheck passes.
- Route tree regenerates automatically.
- Taxi card appears on home, opens taxi screen, location + notes + order flow works, toast shows after order.
