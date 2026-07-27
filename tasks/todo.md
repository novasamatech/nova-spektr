# Staking rework — Dashboard tab + Validator Selection (F1–F10, full scope)

Design source: claude.ai/design project `ea654f00-008b-4edc-bba5-14d93cf5d45f` — `Staking Dashboard Frame.dc.html` (app-embedded frame, state prop: default/loading/empty/healthy/scale/draft), `Staking Dashboard.dc.html` (canvas F1–F10 + F6 drawer/F7 unbond/F8 start-staking markup), `Validator Selection.dc.html` (signingMode prop: local/draft/watch-only).
Detailed research digests: `~/.claude/plans/mutable-floating-simon.md`. Full plan-agent reports: session task outputs (validator-selection `a27fac64a63fc83e0`, dashboard+flows `ac1f3d94f934ed843`, data-layer `a4189ee3dd3515dd1`).

## Decisions (user, 2026-07-27)
- Full scope F1–F10: dashboard widgets + drill-downs + F6 drawer + F7 unbond + F8 start staking + NEW claim flow + validator-selection modal.
- Old `pages/Staking` stays untouched (parallel surface). New validator modal replaces old picker inside bond-nominate + nominate flows.
- Reuse existing UI components; small deltas → extend existing; new only when impossible (only genuinely new primitive: `ui-kit/Drawer`).
- Tests on 3 levels: unit + integration (`tests/integrations/`) per phase, e2e at the end for validation.

## Contract reconciliations (between the three plans)
1. **One validator-selection feature**: `features/validator-selection` (dedicated plan). Keeps old singleton contract `formInitiated/formCleared/output.formSubmitted: Event<Validator[]>` so bond-nominate/nominate flows keep working; same component serves F8 step 2 and drawer "Change validators" (host starts a nominate confirm→sign→submit on formSubmitted). The dashboard plan's `staking-validator-selection` stub is superseded.
2. **Validator view model**: feature consumes `aggregates/staking-validators` (identity-joined `EraValidator` + `$recommended` + persisted criteria), NOT a raw `validatorsDetailsResource`. Field mapping: `nominatorsCount→nominatorCount`, `maxNominatorsRewarded→` expose `maxExposurePageSize` alongside, `clusterId/Position` derived in aggregate from identity parents, `isElected→elected`. `recommendationsService.recommendValidators(validators, identityParents, criteria)` (data-layer signature wins; limit inside criteria).
3. **BLOCKS column**: no direct on-chain source; use era-points heuristic `blocks ≈ round(eraPoints / 20)` (20 pts/authored block), tooltip states it's derived; "0 blocks" warning = eraPoints 0. **Node version: dropped** (unplaced in design UI anyway). ⚠ flag to user.
4. **Positions**: dashboard's `usePositions/StakingPosition` = `aggregates/staking-positions` (`$positions` + `$summary`) + `payoutsResource` for unclaimed + `eraProgressResource` for countdowns. `status` union reconciled: `active|waiting|inactive|bonded` (+ statusReason for tooltips).
5. **AccountIdentity.website**: add optional field in `domains/network/identity` (identityOf has `web`).

## Phases

### Phase 0 — Platform foundations ✅ DONE (2026-07-27, types clean, 27+23+8 tests green)
- [x] `pjsSchema`: `btreeMap`, `codecTuple` + tests (9 tests)
- [x] `shared/pallet/staking` — schema/storage/consts/index, dual-shape `unappliedSlashKeys` (metadata hashers probe), `maxExposurePageSize`, optional `maxNominations`, `bondedEras` null-when-absent + 18 tests
- [x] `TransactionType.PAYOUT_STAKERS_BY_PAGE` — extrinsicService, `buildPayoutStakers` + `MAX_PAYOUT_CALLS_PER_BATCH=10` (sorted era/validator, 1→bare, n→BATCH_ALL), callDataDecoder, 4 exhaustive maps (icons/titles/basket/operation-details), i18n keys, 6 builder tests
- [x] `ui-kit/Drawer` (Radix, `isOpen`/`onToggle` like Modal, `width` default 560, Trigger/Title/Content/Footer + stories)
- [x] `ui-kit/Modal` size `3xl` (w-modal-3xl 85rem); `ui-kit/Table` controlled `sort`/`onSortChange`/`defaultSort`/`getRowKey`/`rowProps` (disabled+selected CSS), glyphs ▾▴⇅ — all 5 existing consumers unaffected
- [x] `shared/lib/csv` — RFC4180 `buildCsv` + `downloadCsv` (Blob, matches existing download-multiple-files pattern) + 8 tests

### Phase 1 — Data layer (`domains/staking` + aggregates) — IN PROGRESS
Landed so far (types clean repo-wide, 112 domain+pallet tests green):
- [x] `exposures/` — `exposuresResource` (one overview prefix read/era, latest-era-only cache) + `exposurePagesResource` (only for requested validators; NEVER full-era paged scan). `exposureService.{getEraOverviews,getExposurePages,checkOversubscribed}`
- [x] `apy/` — pure `calculator.ts` (curve, median commission, per-validator APY) + `apyService.{getStakersEraReward,getEraDurationMs,getAvgRewardPercent,getNetworkApy,getValidatorsApy}`; `apyResource` moved here; old dead `getValidatorsApy` rewritten and now actually wired
- [x] `validators/` — `EraValidator`/`EraValidatorMap`, composed resource (exposures+prefs+points+slashes+APY+blocks), legacy compat via `mapEraValidatorToLegacy` + `useValidators` unchanged, new `useEraValidators`. Legacy paths deleted (`_OLD`, erasStakersClipped, KUSAMA/DEFAULT_MAX_NOMINATORS)
  - **Slash source fixed by controller**: pick by metadata presence, NOT by empty result (empty = healthy, was causing a ~600-key multi every era). `SlashingSpans` primary (historical, matches design badge); staking-async (no SlashingSpans) walks the defer window over `unappliedSlashes`. `DEFAULT_SLASH_DEFER_DURATION = 27` fallback.
- [x] `nominations/` — pooled subscriptions `nominationsResource`/`payeeResource`/`minBondResource` + hooks
- [x] `era/` — `getEraStart` (prefers `ActiveEraInfo.start`, falls back to bondedEras→erasStartSessionIndex session math), `eraProgressResource` (stable anchor, no polling; caches null when unavailable), `getActiveEra` now via pallet (old `@ts-expect-error` gone)
- [x] `payouts/` — SubQuery `eraValidatorInfos` (**schema verified live**: field names, `others.contains` filter, `totalCount` pagination; `others` deliberately not requested in bulk) + pure `calculator.ts` + chain fallback capped at 8 eras (narrowed by nomination targets, not a 600-validator scan) + `source: subquery|chain|unavailable`, `staleAfter` 5 min
- [x] `shared/pallet/staking` gained `erasValidatorPrefsFor` (exact-key `.multi`) and `slashingSpans` now returns `null` when the storage is absent
- [x] `recommendations/` (41 tests) — mandatory `blocked` drop (also inside the degraded pass), relaxable filters with empty-result degradation, APY desc + explicit index tiebreak, cluster cap 2 over the sorted list, `getScoreBreakdown` (BN fixed-point for planck self-stake, clamped 0..1)
  - **Controller fix**: commission score of an all-zero set now returns 1 (0% commission is the best value, not missing data); an *empty* reference set still returns 0. Test updated.
- [x] `positions/` (32 tests) — status matrix + statusReason, unbonding chunks with `redeemable` flag, era-boundary correctness, BN sums. **Agent caught**: exposure `others[].who` is a STASH, so matching must use `stake.stash`, not the (possibly controller) accountId.
- [x] `identity` domain: `website` surfaced (pallet already parsed `web`); also fixed the parent-identity branch silently dropping `github`. 5 fixtures updated, 150 network tests green.
- [x] Barrel `domains/staking/index.ts` wired (exposures/apy/validators/nominations/recommendations/positions/payouts/era-progress)
- [x] `aggregates/staking-validators` (13 tests) — persisted criteria with per-flag hydration validation (raw `$persistedCriteria` → normalized `$criteria`), identity-name cluster keying with a lowest-AccountId representative (keeps `IdentityParentMap` types honest, no domain schema change), identity requests driven by `validatorsResource.push` (avoids the derived-store-as-clock fork pitfall)
- [x] **`shared/query` bug fixed by controller**: `createQueryResource.$pending` was created and exposed but never written to — permanently `{}`. Now tracked per key on requestFx start/done/fail/abort, with the first tests for `shared/query` (3 cases incl. per-key isolation). Nothing consumed it yet, so no behaviour regressed; 577 domain+aggregate tests green after the change.
- [x] `aggregates/staking-positions` (8 tests) — multi-chain (`AssetHubChains ∩ networkModel.$chains`, so Westend AH is no longer silently dropped), one `bindResourcePool` helper diffing desired-vs-active keys for all 7 resources (fork-safe via `scopeBind`), per-chain planck totals never summed across assets, distinct active validators counted per chain. Also starts `stakingResource` per chain (ref-counting makes the overlap with `staking-accounts` free) since that aggregate only covers the selected chain.
- [x] `exposurePagesCacheKey` exported from the barrel; aggregate's byte-identical replica deleted (duplicated invariants drift)
- [x] **Decision — keep both min-bond primitives.** `stakingService.getMinNominatorBond` (one-shot) is used by `features/staking-restake` form models, which belong to the untouched old Staking page. New reactive UI uses `minBondResource`; forcing the old imperative flows onto a subscription is churn outside this scope. Documented rather than migrated.
- [x] Feature Map entries for the two new aggregates (`pnpm check:feature-map` OK — 125 modules)
- [x] Integration tests `tests/integrations/cases/staking/` — **34 cases, suite 223 green**. Composable Asset Hub mock api (`utils/builders/stakingApiBuilder.ts`) answers with REAL polkadot.js codecs so services/pjsSchema/resources above it stay real; `createStakingScenario` added. Cases: positions derivation, chain scope (incl. Westend appearing, non-AH chain never entering), subscription-pool refcount + era roll-over stop-old-start-new, validators criteria/persistence/clusters, payouts (indexer page index, chain fallback, unavailable, staleAfter refetch).
- [x] `eraService.getEraStart` capability check — was throwing a caught `TypeError` (stack trace per era per chain) on Asset Hub whenever no relay api is connected, since `timelineApi` falls back to the staking chain which has neither `session` nor `babe`. A missing anchor is an expected outcome there, not an error.
- [x] `tests/integrations/CLAUDE.md` corrected: rule 8's `@tests/integrations/...` aliases are rejected by the repo's own `local-rules/no-self-import` (all existing cases use relative imports); documented that `autoPopulate: true` + `withWallet`/`withAccount` silently leaves wallet/account stores empty (builder's Dexie DB vs `storageService`'s production DB).

#### Known `shared/query` issues — documented, deliberately NOT fixed mid-feature
1. **Memo and cache store disagree about scope.** `createQueryResource.ts` keeps `requestsCache` in module-level state while `cache.store` is an Effector store, and the `push` is filtered out when the memo answered (`filter: ({ result }) => !result.cached`). Consequence: if a cache store is ever reset or hydrated late while the memo is warm, it can never refill — and `exposuresResource`/`validatorsResource`/`eraProgressResource` use `staleAfter: Infinity`, so "never" is literal. Reproduced across two `fork()`s (second scope's `$cache` stays `{}`); it also forces every test to use a unique era key. **Not fixed now** because the obvious fix (always push) rewrites a ~600-entry map on every cached mount and would re-render every subscriber — a perf regression across governance/staking/identity. Needs a scope-aware memo, which is a `shared/query` redesign, not a staking change.
2. **Subscription refcounts are module-global.** `createSubscriptionResource.ts` keeps `subscriptions` (with `count`) outside Effector, so refcounts survive scope teardown; a consumer that forgets to `reset` leaks a live chain subscription past the scope's death. `stakingPositions.reset` is the only release path — integration tests call it in `afterEach`.

### Phase 1 — original checklist (reference)
- [ ] `exposures/` (overview prefix-read per era, staleAfter ∞, latest-era-only cache; pages resource only for nominated sets/detail — never full-era paged) + unit tests
- [ ] `apy/` (pure calculator + service: AH fixed-inflation via `inflation.experimentalIssuancePredictionInfo`, reward-curve fallback; rewritten per-validator APY; apyResource moves here) + migrate/extend tests
- [ ] `validators/` rework → `EraValidator` (prefs+points+slashes+APY+oversubscribed via composition), delete legacy paths (`_OLD`, erasStakersClipped, KUSAMA_MAX_NOMINATORS), `mapEraValidatorToLegacy` helper
- [ ] `nominations/` + `payee` + `minBond` subscription resources (pooled)
- [ ] `positions/` pure derivation service (active/waiting/inactive/bonded per Android semantics; redeemable) + unit tests
- [ ] `era/` extension: `getEraStart` (BondedEras probe → ErasStartSessionIndex fallback, timeline-chain babe math), `eraProgressResource`
- [ ] `recommendations/` pure service (mandatory !blocked; relaxable !slashed/hasIdentity/!oversubscribed with empty-result relaxation; APY desc; cluster cap 2 by identity parent; limit) + unit tests
- [ ] `payouts/` (SubQuery `eraValidatorInfos` primary — verified live; on-chain fallback capped 8 eras; else `source:'unavailable'`; result carries `page` for tx; staleAfter 5min + restart after payout inclusion) + calculator unit tests
- [ ] `aggregates/staking-positions` (era fan-out sample wiring, `$positions`/`$summary`, replaces `useActiveValidatorCount`) ; `aggregates/staking-validators` (identity join, `$recommended`, persisted criteria `staking_recommendation_criteria`)
- [ ] `identity` domain: optional `website` field
- [ ] Integration tests: `tests/integrations/cases/staking/` — positions derivation, subscription pool refcount + era-change invalidation, validators+criteria persistence, payouts (SubQuery mocked + unavailable degradation); AH staking mock-api fixture

### Phase 2 — Validator selection feature — IN PROGRESS
- [x] `lib/` (pure) + unit tests: sorting (BN for planck, nulls last, displayed-name column, index tiebreak), filters + `filtersDiffer`, order-preserving search over displayed name/SS58 address (never hex accountId), flags with precedence blocked>slashed>oversubscribed>cluster>noIdentity, cluster positions computed over APY order (a badge is a fact about the operator, not about the current sort)
- [x] `model/` singleton preserving the legacy contract (`formInitiated`/`formCleared`/`output.formSubmitted: Event<Validator[]>` via `mapEraValidatorToLegacy`) — 71 lib+model tests
- [x] **Controller fix — chain scoping hazard.** `aggregates/staking-validators` was hard-wired to `stakingNetwork.$selectedChainId`, but the dashboard opens the picker per position across chains: changing nominations on a Kusama position while Polkadot was selected would have silently listed Polkadot validators. Added `scopeChain(chainId | null)` (+ `$chain`, `$api`, `$recommendedValidators` exported); the model scopes on `formInitiated` and clears on `formCleared`. 3 regression tests.
- [x] `ui/` (73 tests) — 9 components, **composition-only except one** (`ValidatorFlagBadge`, a `Label` wrapper reused by table + detail pane). Modal `3xl` + `ui-kit/Table` controlled sort + `Popover`/`Switch`/`SearchInput`/`Progress`/`Alert`/`EmptyMessage`/`Skeleton`; accounts via `NamedAccount`/`Account`, explorers via the chain config (no hardcoded Subscan URL). i18n under `staking.validatorSelection.*`, single-brace interpolation, ordinal plurals for "3rd in cluster".
  - **Controller fixes on top:** (a) surfaced `maxNominatorsRewarded` on `EraValidator` — the cap was computed for `oversubscribed` then thrown away, so the design's "412 / 512" cell could only render a bare count; (b) added `initiatorWallet` to `SelectionInput` so the acting-account chip runs full name resolution per CLAUDE.md (`NamedAccount` needs `wallet`); (c) `count` is a reserved i18next option (must be numeric) — renamed the interpolation variable.
  - Reported, left as-is: `elected: true` is true by construction so the "Not elected" chip is unreachable (correct — the list only holds elected validators); modal height caps at 736px in `ui-kit/Modal.css` vs the design's 836px (needs a ui-kit change, deferred).
- [x] Call-site swap — **4 components, not 2**: the `*Shards` variants also rendered the old picker. All four early-return `<ValidatorSelectionModal>` at the validators step. 6 model files repointed; `form-model.ts` needed only the import change (`restore(output.formSubmitted, [])` unchanged). Draft routing untouched (`formSubmitted → saveAsDraftRequested` under `$isDraftMode`).
  - `lib/signing-info.ts` added (`getSigningMode`, `getDraftSigningInfo`) so both hosts build the payload identically; reads `WalletType` from `@/shared/core` so the feature gains no `entities/` import.
  - `nominatedIds` sourced from the live nominations subscription; **deliberately omitted for multi-shard flows** (each shard nominates its own set — there is no single correct preselection) and never synthesised when the subscription hasn't delivered.
  - `signingInfo` populated only in draft mode from the committed draft path; the two shards flows have no draft mode and pass nothing rather than fabricating a threshold.
- [x] `features/staking/` deleted (grep-proven no importers); 6 dead i18n keys removed (each verified against HEAD as picker-only; `staking.validators.*` keys still used by `widgets/validators-table`/`entities/staking` kept); Feature Map + spec README updated.
**Phase 2 verified**: types clean, 2245 unit tests, 223 integration, feature-map OK (125 modules).

### Phase 2 — original checklist (reference)
- [ ] `features/validator-selection/` lib (pure sorting/filters/order-preserving search per search.md) + unit tests
- [ ] Model (singleton, old contract + extended `SelectionInput` {signingMode, initiator, nominatedIds, signingInfo}) + fork/allSettled model tests (5 scenarios incl. blocked/max/watch-only no-ops, reset discipline)
- [ ] UI: ValidatorSelectionModal + SelectionHeader/Toolbar/FiltersPopover/RecommendationPopover/SelectionTable/ValidatorDetailPane (Subscan via chain explorers; Progress score bars; Alert risk cards)/SelectionFooter/EmptyState — all from existing kit
- [ ] Call-site swap: BondNominate.tsx / Nominate.tsx early-return standalone modal; flows' formInitiated fn extended (signingMode from $isDraftMode/walletUtils, signingInfo from signing-path, nominatedIds preselect for nominate)
- [ ] Delete `features/staking/`, Feature Map update, i18n `staking.validatorSelection.*`, spec README (feature-specs skill)

### Phase 3 — Dashboard widgets ✅ DONE (commits 81a0d1f3f, 839c12e20)
- [x] `dashboard-staking-kpi` (69 tests) — 4 cards + 3 drill-downs (donut breakdown, claim table, positions/unbonding table), CSV export, footers drop when empty, zero-layout-shift skeletons
- [x] `dashboard-staking-positions` (40 tests) — table + F6 drawer + `getAccessMode` (shared helper, KPI agent deleted its duplicate) + pending-draft chips from `useVisibleDrafts`; `Change validators` wired end-to-end into the validator modal scoped to the position's chain
- [x] `dashboard-staking-rewards-chart` (48 tests) — asset toggle + ranges + bucketing + per-account tooltip; era shown only where honestly derivable (Kusama's 6h eras → omitted)
- [x] Slot swap: 3 old injections removed from `dashboardStakingSlot`, `dashboard/staking-summary` kept on Overview; 3 new features registered in bootstrap; Feature Map 128 modules
- [x] **i18n collision caught**: two agents each created a separate `"dashboard.staking"` JSON object — duplicate keys parse fine but silently shadow, so the whole rewards-chart block was dead. Merged; verified with a duplicate-key scan across every nesting level.
- [x] **Address-book positions** — the aggregate sourced accounts from the selected wallet only, so the design's draft-mode row was unreachable. Added `trackAccountIds` (replaces, never accumulates; bounded by the dashboard selection, never the whole address book); tracked ids skip `isAccountAvailableOnChain` (it reads properties a bare address doesn't have) and join every staking chain. Agent also found and fixed a **teardown race**: `reset` had two writers over one snapshot of active keys, which could double-stop or leak a subscription key — teardown is now expressed as "want nothing" through the single diff writer. KPI's access-mode fallback corrected from `watchOnly` to `draft` (it would have stripped actions off exactly these rows).

### Phase 3 — original checklist (reference)
- [ ] `features/dashboard-staking-kpi` (4 cards + skeletons + footers Unbonding/Unclaimed + 640px donut breakdowns + 940px claim & staked/unbonding drill-down modals + CSV export) 
- [ ] `features/dashboard-staking-positions` (flat table sorted Staked↓, sticky-header scroll at 22+, status pills, expiry chips, access-mode cells, empty panel F3, F6 drawer with nominations table + watch-only variant)
- [ ] `features/dashboard-staking-rewards-chart` (DOT/KSM toggle, 7d/30d/90d/1y bucketing w/ era labels, Recharts bars + hover tooltip per-account rows)
- [ ] `lib/position-access.ts` getAccessMode (direct/multisig/draft/watchOnly) + unit tests
- [ ] Remove 3 old widget injections from `features/dashboard-staking` (keep `dashboard/staking-summary` on Overview); bootstrap registration; unclaimed column hidden until payouts resource ready
- [ ] i18n `dashboard.staking.*`; spec READMEs; unit tests (expiry thresholds, sort, bucketing, KPI derivations)

### Phase 4 — Transaction flows
- [ ] `features/staking-claim-rewards` (clone vesting-claim pattern: complex-tx-store + signing-path + validation + sign/submit; multi-account payloads; draft branch via createDraftRequested; success/draft toasts w/ "View drafts →"; draft rows one-at-a-time in v1 multi-select)
- [ ] `features/staking-unbond` (F7: amount+Max, below-min-bond warning non-blocking, chill-on-full-unbond ported from staking-unstake rules, era-based unlock estimate; generalize into AmountFlowModal {unbond|addStake} for drawer "Add stake")
- [ ] `features/staking-start` (F8: account radio w/ modes, signing path section, network segmented, amount + min bond, reward destination; step 2 = validator-selection; then buildBondNominate confirm→sign→submit or draft)
- [ ] Drawer/KPI/claim-modal action wiring; one-flow-at-a-time guard; positions pending-draft chip from drafts store scope
- [ ] Model/integration tests per flow (fee gating, draft branch, multisig deposit surfacing, min-bond boundary)

### Phase 5 — e2e validation (Playwright, at the end)
- [ ] empty → Start staking → validators → sign; KPI vs table consistency; claim select→sign→toast→unclaimed drops; multisig claim → 2/3 path; watch-only → no actions; unbond below-min warning; redeem; 25 positions scroll; chart toggles; draft toast → View drafts navigation

## User decisions on flags (2026-07-27)
1. Node version — dropped. **BLOCKS — resolved by research into `/Users/stepanlavrentev/apps`**: polkadot-js apps does NOT show blocks-per-era. It shows (a) `imOnline.authoredBlocks(currentSessionIndex, stash)` — блоки за ТЕКУЩУЮ сессию, зелёный бейдж "Produced blocks" (`page-staking-async/src/Validators/index.tsx:46` via `api.derive.imOnline.receivedHeartbeats`; historical only via archive `.at(hash)`, `page-staking/src/Query/useBlockCounts.tsx:29`, dead code); (b) "last #" = номер последнего произведённого блока за время работы вкладки (live `subscribeNewHeads`, `react-hooks/src/ctx/BlockAuthors.tsx:39`, НЕ счётчик). Конвертации points→blocks в репо нет.
   **Decision**: `blocksAuthored` in `EraValidator` via runtime probe on the timeline (relay) chain — if `imOnline.authoredBlocks` exists → exact per-session count (one `.multi` over elected set, column labelled "blocks this session"); else → derived estimate `round(eraPoints / 20)` with tooltip that it's derived from era points (upper bound: era points also include para-validation). "0 blocks" warning = 0 in whichever source. Both paths keep ERA PTS column exact.
2. Claim flow drafts: use the app-wide draft-mode pattern (`createDraftModeBinding` slider — modal switches to draft mode; either sign txs OR create drafts, never mixed in one confirmation).
3. "Add stake" = F7 layout via parameterized AmountFlowModal {unbond|addStake}. Approved.

## Runtime verification (browser, 2026-07-27)
Drove the renderer at https://localhost:3000 against the existing dev wallet (`parrent`, no staking positions).
- **New Staking dashboard tab renders correctly** — matches design frame F3 (first-time empty): KPI cards show zeros and `—`, NOT skeletons (data is loaded, just empty); the Unbonding/Unclaimed footers are correctly absent; the positions panel shows the icon, "No staking positions yet", the multisig/Address-Book explainer, `Start staking` and `Learn how staking works`; the rewards card shows the asset toggle, `0 DOT ≈ $0 · last 30 days` and the empty-history text.
- **Multi-chain fix confirmed visually**: the rewards asset toggle offers **DOT / KSM / WND** — Westend appears because it is in the dev chain config, which is exactly what the old hardcoded pair dropped.
- **No runtime errors.** Only pre-existing effector `$fee → *` skipVoid warnings, which also fire on untouched flows.
- **Old `/staking` page still renders** after `features/staking` was deleted — network selector, totals and the accounts list all fine, so the picker swap caused no regression.
- ⚠️ **A washed-out, right-shifted first screenshot was an automation artifact, not a bug**: the automated tab reports `visibilityState: "hidden"`, so `requestAnimationFrame` is throttled and the Tabs carousel spring freezes mid-transition (panel opacities summed to exactly 1.0). Untouched Governance froze the same way. Forcing the settled transform rendered everything correctly. Do not "fix" this.
- **Not verified in browser**: the validator-selection modal, and frames F5/F6/F7/F10 (claim drill-down, position drawer, unbond, draft toast). All need a funded staking account — this dev wallet holds 1.13 DOT against a 250 DOT minimum bond. Covered by 73 unit/model tests plus a render smoke test; real visual conformance is Phase 5 e2e work.

## Found bug in the OLD flow — needs a decision (not fixed; that page is out of scope)
`features/staking-unstake` chills at `leftAmount.lte(minBond)` — `model/form-model.ts:218`, `:349`, `model/form-model-shards.ts:357`. Unbonding down to **exactly** the minimum bond leaves a still-valid nominating position, so wrapping `chill` there drops the user's nominations for no reason and they stop earning until they re-nominate. The new `staking-amount-flow` uses strict `<` (plus "a full unbond always chills, even when the minimum is unknown"). The fix is `lte` → `lt` at three sites; no test encodes the current behaviour. Left untouched because the old Staking page was explicitly scoped out — needs a go-ahead.

## Verification per phase
`pnpm types:go` + affected unit suites + `pnpm test:integration` staking cases; renderer runtime check via `verify` skill (browser-drive) after Phases 2–4; e2e suite in Phase 5; feature-map check `pnpm check:feature-map`.
