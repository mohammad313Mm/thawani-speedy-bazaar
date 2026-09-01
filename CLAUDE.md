# ثواني (Thawani Hub) — Project Memory

## Stack
- TanStack Start (React 19 + Router/Query) on Vite 8, TypeScript. Package manager: **bun**.
- Tailwind v4 + shadcn/radix, Arabic/RTL first. Backend: Supabase. Native shell: Capacitor 8, Android only.
- Server logic lives in `src/lib/*.functions.ts` via `createServerFn`. Deploy target: Cloudflare Workers
  (hence Web Crypto, not Node crypto). Hosted by Lovable; do not rewrite pushed git history.

## Layout
- `src/routes/` — file routes (`merchant.dashboard.tsx` → `/merchant/dashboard`; **dots become slashes**).
- `src/lib/fcm.server.ts` — FCM HTTP v1 sender (JWT signed with Web Crypto).
- `src/lib/push-notifications.ts` — the *only* push client: channel, permission, register, token, tap routing.
- `src/components/PushPermissionNotice.tsx` — global banner when a work role lacks notification permission.
- `supabase/migrations/` — SQL. `android/` — Capacitor project (`app.lovable.thawani313`).

## Where things run — the rule that explains most confusion
The APK is a **shell**: `capacitor.config.ts` sets `server.url` to the deployed site, so the WebView loads
production. There is no static `index.html` (SSR only) and ~158 `createServerFn` calls need a same-origin
server, so a bundled-assets build cannot work.

| Change in | Needs |
|---|---|
| `src/**` | Publish in Lovable. **No new APK.** |
| `android/**`, `capacitor.config.ts` | **New APK** + reinstall. No Publish. |

## Secrets
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are **injected by Lovable Cloud** in production — not your job.
- `FIREBASE_SERVICE_ACCOUNT` is ours: set it in **Lovable → secrets** (raw JSON, no surrounding quotes).
- `.env` is gitignored and only matters for local dev.

## Roles
`app_role` = `customer | merchant | driver | admin`. **There is no `taxi` role** — taxi drivers are ordinary
customers whose phone the admin authorized in `taxi_drivers`; resolve with the `is_taxi_driver` RPC.
`device_tokens.role` is a *device* role: `merchant | driver | taxi`, verified server-side for `taxi`.

## Push notification invariants — do not regress these
- `push-notifications.ts` owns everything. **Never add a second push initializer**; a duplicate that calls
  `removeAllListeners()` silently wipes these listeners and the token is never stored.
- The Android channel `orders_high_priority` must be created client-side, or Android drops the message's
  priority/sound onto a low-importance fallback channel.
- `data.route` must match real router paths (`/driver/dashboard`, never `/driver.dashboard`).
- Token is bound to user id + device role; sign-out calls `disablePushNotifications()` **before**
  `supabase.auth.signOut()` because removing the token needs a live session.
- Merchants/drivers must never wait on the `is_taxi_driver` RPC — gating them on it blocks the permission
  prompt entirely when the RPC is slow or fails.
- Taxi fan-out re-resolves authorized drivers from `taxi_drivers` (by `user_id` **and** by phone via
  `profiles`), so deactivating a driver stops their pushes immediately.
- `IncomingOrderModal` rings for `RING_SECONDS` (60) and stops the moment it unmounts (accept/reject).
  This only works while the app is foregrounded; background ringing would need a long `res/raw` sound.

## Building the APK (macOS)
`gradlew` may carry a quarantine xattr — run `sh gradlew`, not `./gradlew`. Capacitor 8 needs **JDK 21**
exactly (17 is too old for source 21; 25 breaks Gradle's Groovy). Then:
`npx vite build && npx cap sync android && cd android && sh gradlew assembleDebug`

## Open TODO
- Rotate the Firebase service-account key and the Supabase `service_role` key — both were exposed in chat.
- Background ringing (app closed) still plays only the short system notification sound.
