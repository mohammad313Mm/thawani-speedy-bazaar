<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep taxi vehicle validation and label resolution in `src/lib/taxi-vehicle.ts`; a shared definition enforces the two allowed new-request values while safely displaying legacy rows without a selection.
- Keep offer (discount) price rules in `src/lib/offers.ts`; orders, customer product mapping and admin/merchant validation share it so the charged price never diverges from the shown one.
- Delete finished orders through the admin-verified server function and atomic service-only database function; shared deletion refresh and cache reconciliation prevent stale copies without changing order workflows.
- Dispatch general-order admin push independently of merchant notifications through the existing FCM sender and registered admin devices, awaiting it before responding so merchant errors or Worker termination cannot suppress it.
- Send support-chat pushes only through `notifySupportMessage` (`src/lib/support.functions.ts`) after the chat row is inserted, claiming `push_sent_at` atomically; customers register as device role `customer` without a startup permission prompt (the support page asks), so one message rings the other party exactly once.
- Keep the store owner's order labels and allowed status transitions in `src/lib/merchant-order-status.ts`, backed by the `customer_orders_guard_status_regression` trigger; a stale incoming-order card must never pull an approved order out of the active lists.
- Keep order and join-application cutoffs separate inside the existing daily cleanup function; order-retention changes must not alter unrelated application retention or the cleanup schedule.
