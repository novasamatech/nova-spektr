# Claim / Claim all — make the flow actually run

## What is actually broken (measured, not assumed)

Clicking Claim fires the event and **nothing happens: no modal, no error, no log**. The chain of causes:

1. `lib/validator-rewards.ts:112` picks the row's signer with `canAct(accessMode)`, and `canAct` only excludes
   `watchOnly`. An **address-book contact** resolves to `'draft'`, which passes.
2. `toClaimRequests` therefore emits `accountId` = a contact.
3. `staking-dashboard-actions/lib/resolve.ts:79` drops every entry whose account is not a **local wallet account**
   (`resolveAccount` returns `null`), by design — documented and unit-tested.
4. `wiring.ts:163` `claimGroups.filterMap((groups) => groups.at(0))` turns the empty list into **no clock tick**.
   `filterMap` returning `undefined` is a silent no-op, so nothing is ever reported.

Both positions on this machine are address-book contacts (verified in the app), so today there is no local signer for
either row and the button can never work.

## The fact that makes the fix possible

`staking.payout_stakers_by_page(validator_stash, era, page)` is **permissionless**. The call names the _validator_,
never the nominator; the reward is credited to each nominator's own payee whoever submits it. So the account that pays
the fee is free to be **any** account of ours — including when the nominating stash is a contact we cannot sign for.

That is exactly the requested behaviour: default to the nominator, allow changing to any available account.

## What already exists (do not rebuild)

- `features/staking-claim-rewards` is already built to the app's canonical shape: `createComplexTxStore` +
  `createTxValidator` + `createTxValidationStore` + `createSigningPathModel` + `createTransactionConfirmStore`, payout
  chunking at 10 calls per batch, per-account signing routes, draft mode.
- For a payout batch the correct validation set is **`createTxValidator()` with no extra rules** — fee affordability,
  the existential-deposit guard (`tryWithdraw(..., 'keepAlive')`), per-hop route balances, multisig deposit and proxy
  call permission are all built in. `payout_stakers` moves nothing out of the sender, so there is no amount rule.
- **Two-stage signing already exists** as a chain of sessions: `wiring.ts:139-200` keeps a `$claimQueue` of the
  remaining chain groups and dispatches the next one after the previous session lands.

## What does not exist, and why we are not building it

A single signing session spanning two chains. It is blocked three layers down and would be **unsafe**: Extension and
WalletConnect build signing metadata once from `payloads.at(0)` and then bump the nonce per payload, so a cross-chain
array signs against the wrong genesis hash and nonce. The claim feature's own spec already records the position: one
network per session, because a fee total spanning two native tokens cannot be quoted honestly.

## Plan

- [ ] **1. Split "whose rewards" from "who pays".** `ClaimRequest` carries `stash` (may be a contact) and `payer` (must
      be locally signable). The KPI sends both; the payout args are unchanged either way.
- [ ] **2. Resolve the payer, not the stash** (`staking-dashboard-actions/lib/resolve.ts`): the row's own account when
      it is signable, otherwise the wallet's default signable account on that chain. Keep dropping nothing silently.
- [ ] **3. Report instead of swallowing.** When no entry resolves, surface why — "no account of this wallet can sign on
      <chain>" — rather than a dead button.
- [ ] **4. Make the payer visible and changeable.** The confirm renders `SigningPathSection`, which hides itself below
      two hops, so a direct payer is invisible today. Use `SigningPathInline editableInitiator` (as the new-position
      flow does) so the payer is always shown and can be swapped for any own account.
- [ ] **5. Disable what cannot run.** A row whose chain has no signable account gets a disabled Claim with a reason,
      instead of an enabled button that does nothing.
- [ ] **6. Surface the queue.** When Claim all spans two networks, the confirm says which network this session is and
      how many follow.
- [ ] **7. Tests.** Unit: payer resolution (own / contact / none), request splitting, queue advance. Extend
      `staking-dashboard-actions/__tests__/wiring.test.ts` — it currently _asserts the silent drop_ as correct.
- [ ] **8. Live run** over CDP up to the sign step, both single-chain and two-chain.

## Verification

`pnpm types:go` · `pnpm lint` · full suite · `pnpm check:feature-map` · specs of both touched features. The signature
itself cannot be produced here — the wallet on this machine holds no signable key for these positions — so the live run
stops at the sign step and that limit gets stated.

## Done (2026-07-31)

- [x] 1-2. `ClaimRequestPayload` now carries `{ chainId, nominators, payouts }` — whose rewards, not who signs — and
      `resolveClaimPayer` picks the payer: the nominator when we hold it, otherwise any account of ours that can sign on
      that chain.
- [x] 3. `resolveClaimRequests` returns `{ requests, skipped }`; an unresolvable selection reaches the row through
     `claimBlocked` instead of vanishing.
- [x] 4. The confirm renders `SigningPathInline editableInitiator` — the payer is visible with one hop and changeable to
     any own account. Changing it rewrites the sender of every plan, so fee, route and validation follow.
- [x] 5. `useSignableChains` gates the buttons: a network we hold no key for gets a disabled Claim with the reason.
- [x] 7. Tests rewritten — the two that asserted the silent drop as correct now assert the opposite, plus payer
     preference, per-chain grouping and the no-key case.
- [ ] 6. "Network N of M" on the confirm — not done. The confirm already names the skipped chains and the queue already
     advances by itself; the counter is cosmetic and was cut rather than half-done.

### Verified in the running app

Claim on a **DOT** row: confirm opens with `106.6646170157 DOT`, network fee `0.01367 DOT`, signing path with an
editable initiator. Claim on a **KSM** row: `20.404072790976 KSM`, `$61`. Clicking the source card opens "Edit signing
path → Source account". Both nominators are address-book contacts, so before this change neither could be claimed at
all.

**Not verified:** the signature itself and the multi-chain queue completing — this machine holds no signing key for
these positions, so the run stops at "Sign with Nova Wallet".
