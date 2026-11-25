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
