# Staking rework — Dashboard tab + Validator Selection (F1–F10, full scope)

Design source: claude.ai/design project `ea654f00-008b-4edc-bba5-14d93cf5d45f` — `Staking Dashboard Frame.dc.html`
(app-embedded frame, state prop: default/loading/empty/healthy/scale/draft), `Staking Dashboard.dc.html` (canvas
F1–F10 + F6 drawer/F7 unbond/F8 start-staking markup), `Validator Selection.dc.html` (signingMode prop:
local/draft/watch-only). Detailed research digests: `~/.claude/plans/mutable-floating-simon.md`. Full plan-agent
reports: session task outputs (validator-selection `a27fac64a63fc83e0`, dashboard+flows `ac1f3d94f934ed843`, data-layer
`a4189ee3dd3515dd1`).

## Decisions (user, 2026-07-27)

- Full scope F1–F10: dashboard widgets + drill-downs + F6 drawer + F7 unbond + F8 start staking + NEW claim flow +
  validator-selection modal.
- Old `pages/Staking` stays untouched (parallel surface). New validator modal replaces old picker inside bond-nominate +
  nominate flows.
- Reuse existing UI components; small deltas → extend existing; new only when impossible (only genuinely new primitive:
  `ui-kit/Drawer`).
- Tests on 3 levels: unit + integration (`tests/integrations/`) per phase, e2e at the end for validation.

## Contract reconciliations (between the three plans)

1. **One validator-selection feature**: `features/validator-selection` (dedicated plan). Keeps old singleton contract
   `formInitiated/formCleared/output.formSubmitted: Event<Validator[]>` so bond-nominate/nominate flows keep working;
   same component serves F8 step 2 and drawer "Change validators" (host starts a nominate confirm→sign→submit on
   formSubmitted). The dashboard plan's `staking-validator-selection` stub is superseded.
2. **Validator view model**: feature consumes `aggregates/staking-validators` (identity-joined `EraValidator` +
   `$recommended` + persisted criteria), NOT a raw `validatorsDetailsResource`. Field mapping:
   `nominatorsCount→nominatorCount`, `maxNominatorsRewarded→` expose `maxExposurePageSize` alongside,
   `clusterId/Position` derived in aggregate from identity parents, `isElected→elected`.
   `recommendationsService.recommendValidators(validators, identityParents, criteria)` (data-layer signature wins; limit
   inside criteria).
3. **BLOCKS column**: no direct on-chain source; use era-points heuristic `blocks ≈ round(eraPoints / 20)` (20
   pts/authored block), tooltip states it's derived; "0 blocks" warning = eraPoints 0. **Node version: dropped**
   (unplaced in design UI anyway). ⚠ flag to user.
4. **Positions**: dashboard's `usePositions/StakingPosition` = `aggregates/staking-positions` (`$positions` +
   `$summary`) + `payoutsResource` for unclaimed + `eraProgressResource` for countdowns. `status` union reconciled:
   `active|waiting|inactive|bonded` (+ statusReason for tooltips).
5. **AccountIdentity.website**: add optional field in `domains/network/identity` (identityOf has `web`).

## Phases

### Phase 0 — Platform foundations ✅ DONE (2026-07-27, types clean, 27+23+8 tests green)

- [x] `pjsSchema`: `btreeMap`, `codecTuple` + tests (9 tests)
- [x] `shared/pallet/staking` — schema/storage/consts/index, dual-shape `unappliedSlashKeys` (metadata hashers probe),
      `maxExposurePageSize`, optional `maxNominations`, `bondedEras` null-when-absent + 18 tests
- [x] `TransactionType.PAYOUT_STAKERS_BY_PAGE` — extrinsicService, `buildPayoutStakers` +
      `MAX_PAYOUT_CALLS_PER_BATCH=10` (sorted era/validator, 1→bare, n→BATCH_ALL), callDataDecoder, 4 exhaustive maps
      (icons/titles/basket/operation-details), i18n keys, 6 builder tests
- [x] `ui-kit/Drawer` (Radix, `isOpen`/`onToggle` like Modal, `width` default 560, Trigger/Title/Content/Footer +
      stories)
- [x] `ui-kit/Modal` size `3xl` (w-modal-3xl 85rem); `ui-kit/Table` controlled
      `sort`/`onSortChange`/`defaultSort`/`getRowKey`/`rowProps` (disabled+selected CSS), glyphs ▾▴⇅ — all 5 existing
      consumers unaffected
- [x] `shared/lib/csv` — RFC4180 `buildCsv` + `downloadCsv` (Blob, matches existing download-multiple-files pattern) + 8
      tests

### Phase 1 — Data layer (`domains/staking` + aggregates) — IN PROGRESS

Landed so far (types clean repo-wide, 112 domain+pallet tests green):

- [x] `exposures/` — `exposuresResource` (one overview prefix read/era, latest-era-only cache) + `exposurePagesResource`
      (only for requested validators; NEVER full-era paged scan).
      `exposureService.{getEraOverviews,getExposurePages,checkOversubscribed}`
- [x] `apy/` — pure `calculator.ts` (curve, median commission, per-validator APY) +
      `apyService.{getStakersEraReward,getEraDurationMs,getAvgRewardPercent,getNetworkApy,getValidatorsApy}`;
      `apyResource` moved here; old dead `getValidatorsApy` rewritten and now actually wired
- [x] `validators/` — `EraValidator`/`EraValidatorMap`, composed resource (exposures+prefs+points+slashes+APY+blocks),
      legacy compat via `mapEraValidatorToLegacy` + `useValidators` unchanged, new `useEraValidators`. Legacy paths
      deleted (`_OLD`, erasStakersClipped, KUSAMA/DEFAULT_MAX_NOMINATORS)
  - **Slash source fixed by controller**: pick by metadata presence, NOT by empty result (empty = healthy, was causing a
    ~600-key multi every era). `SlashingSpans` primary (historical, matches design badge); staking-async (no
    SlashingSpans) walks the defer window over `unappliedSlashes`. `DEFAULT_SLASH_DEFER_DURATION = 27` fallback.
- [x] `nominations/` — pooled subscriptions `nominationsResource`/`payeeResource`/`minBondResource` + hooks
- [x] `era/` — `getEraStart` (prefers `ActiveEraInfo.start`, falls back to bondedEras→erasStartSessionIndex session
      math), `eraProgressResource` (stable anchor, no polling; caches null when unavailable), `getActiveEra` now via
      pallet (old `@ts-expect-error` gone)
- [x] `payouts/` — SubQuery `eraValidatorInfos` (**schema verified live**: field names, `others.contains` filter,
      `totalCount` pagination; `others` deliberately not requested in bulk) + pure `calculator.ts` + chain fallback
      capped at 8 eras (narrowed by nomination targets, not a 600-validator scan) +
      `source: subquery|chain|unavailable`, `staleAfter` 5 min
- [x] `shared/pallet/staking` gained `erasValidatorPrefsFor` (exact-key `.multi`) and `slashingSpans` now returns `null`
      when the storage is absent
- [x] `recommendations/` (41 tests) — mandatory `blocked` drop (also inside the degraded pass), relaxable filters with
      empty-result degradation, APY desc + explicit index tiebreak, cluster cap 2 over the sorted list,
      `getScoreBreakdown` (BN fixed-point for planck self-stake, clamped 0..1)
  - **Controller fix**: commission score of an all-zero set now returns 1 (0% commission is the best value, not missing
    data); an _empty_ reference set still returns 0. Test updated.
- [x] `positions/` (32 tests) — status matrix + statusReason, unbonding chunks with `redeemable` flag, era-boundary
      correctness, BN sums. **Agent caught**: exposure `others[].who` is a STASH, so matching must use `stake.stash`,
      not the (possibly controller) accountId.
- [x] `identity` domain: `website` surfaced (pallet already parsed `web`); also fixed the parent-identity branch
      silently dropping `github`. 5 fixtures updated, 150 network tests green.
- [x] Barrel `domains/staking/index.ts` wired
      (exposures/apy/validators/nominations/recommendations/positions/payouts/era-progress)
- [x] `aggregates/staking-validators` (13 tests) — persisted criteria with per-flag hydration validation (raw
      `$persistedCriteria` → normalized `$criteria`), identity-name cluster keying with a lowest-AccountId
      representative (keeps `IdentityParentMap` types honest, no domain schema change), identity requests driven by
      `validatorsResource.push` (avoids the derived-store-as-clock fork pitfall)
- [x] **`shared/query` bug fixed by controller**: `createQueryResource.$pending` was created and exposed but never
      written to — permanently `{}`. Now tracked per key on requestFx start/done/fail/abort, with the first tests for
      `shared/query` (3 cases incl. per-key isolation). Nothing consumed it yet, so no behaviour regressed; 577
      domain+aggregate tests green after the change.
- [x] `aggregates/staking-positions` (8 tests) — multi-chain (`AssetHubChains ∩ networkModel.$chains`, so Westend AH is
      no longer silently dropped), one `bindResourcePool` helper diffing desired-vs-active keys for all 7 resources
      (fork-safe via `scopeBind`), per-chain planck totals never summed across assets, distinct active validators
      counted per chain. Also starts `stakingResource` per chain (ref-counting makes the overlap with `staking-accounts`
      free) since that aggregate only covers the selected chain.
- [x] `exposurePagesCacheKey` exported from the barrel; aggregate's byte-identical replica deleted (duplicated
      invariants drift)
- [x] **Decision — keep both min-bond primitives.** `stakingService.getMinNominatorBond` (one-shot) is used by
      `features/staking-restake` form models, which belong to the untouched old Staking page. New reactive UI uses
      `minBondResource`; forcing the old imperative flows onto a subscription is churn outside this scope. Documented
      rather than migrated.
- [x] Feature Map entries for the two new aggregates (`pnpm check:feature-map` OK — 125 modules)
- [x] Integration tests `tests/integrations/cases/staking/` — **34 cases, suite 223 green**. Composable Asset Hub mock
      api (`utils/builders/stakingApiBuilder.ts`) answers with REAL polkadot.js codecs so services/pjsSchema/resources
      above it stay real; `createStakingScenario` added. Cases: positions derivation, chain scope (incl. Westend
      appearing, non-AH chain never entering), subscription-pool refcount + era roll-over stop-old-start-new, validators
      criteria/persistence/clusters, payouts (indexer page index, chain fallback, unavailable, staleAfter refetch).
- [x] `eraService.getEraStart` capability check — was throwing a caught `TypeError` (stack trace per era per chain) on
      Asset Hub whenever no relay api is connected, since `timelineApi` falls back to the staking chain which has
      neither `session` nor `babe`. A missing anchor is an expected outcome there, not an error.
- [x] `tests/integrations/CLAUDE.md` corrected: rule 8's `@tests/integrations/...` aliases are rejected by the repo's
      own `local-rules/no-self-import` (all existing cases use relative imports); documented that `autoPopulate: true` +
      `withWallet`/`withAccount` silently leaves wallet/account stores empty (builder's Dexie DB vs `storageService`'s
      production DB).

#### Known `shared/query` issues — documented, deliberately NOT fixed mid-feature

1. **Memo and cache store disagree about scope.** `createQueryResource.ts` keeps `requestsCache` in module-level state
   while `cache.store` is an Effector store, and the `push` is filtered out when the memo answered
   (`filter: ({ result }) => !result.cached`). Consequence: if a cache store is ever reset or hydrated late while the
   memo is warm, it can never refill — and `exposuresResource`/`validatorsResource`/`eraProgressResource` use
   `staleAfter: Infinity`, so "never" is literal. Reproduced across two `fork()`s (second scope's `$cache` stays `{}`);
   it also forces every test to use a unique era key. **Not fixed now** because the obvious fix (always push) rewrites a
   ~600-entry map on every cached mount and would re-render every subscriber — a perf regression across
   governance/staking/identity. Needs a scope-aware memo, which is a `shared/query` redesign, not a staking change.
2. **Subscription refcounts are module-global.** `createSubscriptionResource.ts` keeps `subscriptions` (with `count`)
   outside Effector, so refcounts survive scope teardown; a consumer that forgets to `reset` leaks a live chain
   subscription past the scope's death. `stakingPositions.reset` is the only release path — integration tests call it in
   `afterEach`.

### Phase 1 — original checklist (reference)

- [ ] `exposures/` (overview prefix-read per era, staleAfter ∞, latest-era-only cache; pages resource only for nominated
      sets/detail — never full-era paged) + unit tests
- [ ] `apy/` (pure calculator + service: AH fixed-inflation via `inflation.experimentalIssuancePredictionInfo`,
      reward-curve fallback; rewritten per-validator APY; apyResource moves here) + migrate/extend tests
- [ ] `validators/` rework → `EraValidator` (prefs+points+slashes+APY+oversubscribed via composition), delete legacy
      paths (`_OLD`, erasStakersClipped, KUSAMA_MAX_NOMINATORS), `mapEraValidatorToLegacy` helper
- [ ] `nominations/` + `payee` + `minBond` subscription resources (pooled)
- [ ] `positions/` pure derivation service (active/waiting/inactive/bonded per Android semantics; redeemable) + unit
      tests
- [ ] `era/` extension: `getEraStart` (BondedEras probe → ErasStartSessionIndex fallback, timeline-chain babe math),
      `eraProgressResource`
- [ ] `recommendations/` pure service (mandatory !blocked; relaxable !slashed/hasIdentity/!oversubscribed with
      empty-result relaxation; APY desc; cluster cap 2 by identity parent; limit) + unit tests
- [ ] `payouts/` (SubQuery `eraValidatorInfos` primary — verified live; on-chain fallback capped 8 eras; else
      `source:'unavailable'`; result carries `page` for tx; staleAfter 5min + restart after payout inclusion) +
      calculator unit tests
- [ ] `aggregates/staking-positions` (era fan-out sample wiring, `$positions`/`$summary`, replaces
      `useActiveValidatorCount`) ; `aggregates/staking-validators` (identity join, `$recommended`, persisted criteria
      `staking_recommendation_criteria`)
- [ ] `identity` domain: optional `website` field
- [ ] Integration tests: `tests/integrations/cases/staking/` — positions derivation, subscription pool refcount +
      era-change invalidation, validators+criteria persistence, payouts (SubQuery mocked + unavailable degradation); AH
      staking mock-api fixture

### Phase 2 — Validator selection feature — IN PROGRESS

- [x] `lib/` (pure) + unit tests: sorting (BN for planck, nulls last, displayed-name column, index tiebreak), filters +
      `filtersDiffer`, order-preserving search over displayed name/SS58 address (never hex accountId), flags with
      precedence blocked>slashed>oversubscribed>cluster>noIdentity, cluster positions computed over APY order (a badge
      is a fact about the operator, not about the current sort)
- [x] `model/` singleton preserving the legacy contract
      (`formInitiated`/`formCleared`/`output.formSubmitted: Event<Validator[]>` via `mapEraValidatorToLegacy`) — 71
      lib+model tests
- [x] **Controller fix — chain scoping hazard.** `aggregates/staking-validators` was hard-wired to
      `stakingNetwork.$selectedChainId`, but the dashboard opens the picker per position across chains: changing
      nominations on a Kusama position while Polkadot was selected would have silently listed Polkadot validators. Added
      `scopeChain(chainId | null)` (+ `$chain`, `$api`, `$recommendedValidators` exported); the model scopes on
      `formInitiated` and clears on `formCleared`. 3 regression tests.
- [x] `ui/` (73 tests) — 9 components, **composition-only except one** (`ValidatorFlagBadge`, a `Label` wrapper reused
      by table + detail pane). Modal `3xl` + `ui-kit/Table` controlled sort +
      `Popover`/`Switch`/`SearchInput`/`Progress`/`Alert`/`EmptyMessage`/`Skeleton`; accounts via
      `NamedAccount`/`Account`, explorers via the chain config (no hardcoded Subscan URL). i18n under
      `staking.validatorSelection.*`, single-brace interpolation, ordinal plurals for "3rd in cluster".
  - **Controller fixes on top:** (a) surfaced `maxNominatorsRewarded` on `EraValidator` — the cap was computed for
    `oversubscribed` then thrown away, so the design's "412 / 512" cell could only render a bare count; (b) added
    `initiatorWallet` to `SelectionInput` so the acting-account chip runs full name resolution per CLAUDE.md
    (`NamedAccount` needs `wallet`); (c) `count` is a reserved i18next option (must be numeric) — renamed the
    interpolation variable.
  - Reported, left as-is: `elected: true` is true by construction so the "Not elected" chip is unreachable (correct —
    the list only holds elected validators); modal height caps at 736px in `ui-kit/Modal.css` vs the design's 836px
    (needs a ui-kit change, deferred).
- [x] Call-site swap — **4 components, not 2**: the `*Shards` variants also rendered the old picker. All four
      early-return `<ValidatorSelectionModal>` at the validators step. 6 model files repointed; `form-model.ts` needed
      only the import change (`restore(output.formSubmitted, [])` unchanged). Draft routing untouched
      (`formSubmitted → saveAsDraftRequested` under `$isDraftMode`).
  - `lib/signing-info.ts` added (`getSigningMode`, `getDraftSigningInfo`) so both hosts build the payload identically;
    reads `WalletType` from `@/shared/core` so the feature gains no `entities/` import.
  - `nominatedIds` sourced from the live nominations subscription; **deliberately omitted for multi-shard flows** (each
    shard nominates its own set — there is no single correct preselection) and never synthesised when the subscription
    hasn't delivered.
  - `signingInfo` populated only in draft mode from the committed draft path; the two shards flows have no draft mode
    and pass nothing rather than fabricating a threshold.
- [x] `features/staking/` deleted (grep-proven no importers); 6 dead i18n keys removed (each verified against HEAD as
      picker-only; `staking.validators.*` keys still used by `widgets/validators-table`/`entities/staking` kept);
      Feature Map + spec README updated. **Phase 2 verified**: types clean, 2245 unit tests, 223 integration,
      feature-map OK (125 modules).

### Phase 2 — original checklist (reference)

- [ ] `features/validator-selection/` lib (pure sorting/filters/order-preserving search per search.md) + unit tests
- [ ] Model (singleton, old contract + extended `SelectionInput` {signingMode, initiator, nominatedIds, signingInfo}) +
      fork/allSettled model tests (5 scenarios incl. blocked/max/watch-only no-ops, reset discipline)
- [ ] UI: ValidatorSelectionModal +
      SelectionHeader/Toolbar/FiltersPopover/RecommendationPopover/SelectionTable/ValidatorDetailPane (Subscan via chain
      explorers; Progress score bars; Alert risk cards)/SelectionFooter/EmptyState — all from existing kit
- [ ] Call-site swap: BondNominate.tsx / Nominate.tsx early-return standalone modal; flows' formInitiated fn extended
      (signingMode from $isDraftMode/walletUtils, signingInfo from signing-path, nominatedIds preselect for nominate)
- [ ] Delete `features/staking/`, Feature Map update, i18n `staking.validatorSelection.*`, spec README (feature-specs
      skill)

### Phase 3 — Dashboard widgets ✅ DONE (commits 81a0d1f3f, 839c12e20)

- [x] `dashboard-staking-kpi` (69 tests) — 4 cards + 3 drill-downs (donut breakdown, claim table, positions/unbonding
      table), CSV export, footers drop when empty, zero-layout-shift skeletons
- [x] `dashboard-staking-positions` (40 tests) — table + F6 drawer + `getAccessMode` (shared helper, KPI agent deleted
      its duplicate) + pending-draft chips from `useVisibleDrafts`; `Change validators` wired end-to-end into the
      validator modal scoped to the position's chain
- [x] `dashboard-staking-rewards-chart` (48 tests) — asset toggle + ranges + bucketing + per-account tooltip; era shown
      only where honestly derivable (Kusama's 6h eras → omitted)
- [x] Slot swap: 3 old injections removed from `dashboardStakingSlot`, `dashboard/staking-summary` kept on Overview; 3
      new features registered in bootstrap; Feature Map 128 modules
- [x] **i18n collision caught**: two agents each created a separate `"dashboard.staking"` JSON object — duplicate keys
      parse fine but silently shadow, so the whole rewards-chart block was dead. Merged; verified with a duplicate-key
      scan across every nesting level.
- [x] **Address-book positions** — the aggregate sourced accounts from the selected wallet only, so the design's
      draft-mode row was unreachable. Added `trackAccountIds` (replaces, never accumulates; bounded by the dashboard
      selection, never the whole address book); tracked ids skip `isAccountAvailableOnChain` (it reads properties a bare
      address doesn't have) and join every staking chain. Agent also found and fixed a **teardown race**: `reset` had
      two writers over one snapshot of active keys, which could double-stop or leak a subscription key — teardown is now
      expressed as "want nothing" through the single diff writer. KPI's access-mode fallback corrected from `watchOnly`
      to `draft` (it would have stripped actions off exactly these rows).

### Phase 3 — original checklist (reference)

- [ ] `features/dashboard-staking-kpi` (4 cards + skeletons + footers Unbonding/Unclaimed + 640px donut breakdowns +
      940px claim & staked/unbonding drill-down modals + CSV export)
- [ ] `features/dashboard-staking-positions` (flat table sorted Staked↓, sticky-header scroll at 22+, status pills,
      expiry chips, access-mode cells, empty panel F3, F6 drawer with nominations table + watch-only variant)
- [ ] `features/dashboard-staking-rewards-chart` (DOT/KSM toggle, 7d/30d/90d/1y bucketing w/ era labels, Recharts bars +
      hover tooltip per-account rows)
- [ ] `lib/position-access.ts` getAccessMode (direct/multisig/draft/watchOnly) + unit tests
- [ ] Remove 3 old widget injections from `features/dashboard-staking` (keep `dashboard/staking-summary` on Overview);
      bootstrap registration; unclaimed column hidden until payouts resource ready
- [ ] i18n `dashboard.staking.*`; spec READMEs; unit tests (expiry thresholds, sort, bucketing, KPI derivations)

### Phase 4 — Transaction flows

- [ ] `features/staking-claim-rewards` (clone vesting-claim pattern: complex-tx-store + signing-path + validation +
      sign/submit; multi-account payloads; draft branch via createDraftRequested; success/draft toasts w/ "View drafts
      →"; draft rows one-at-a-time in v1 multi-select)
- [ ] `features/staking-unbond` (F7: amount+Max, below-min-bond warning non-blocking, chill-on-full-unbond ported from
      staking-unstake rules, era-based unlock estimate; generalize into AmountFlowModal {unbond|addStake} for drawer
      "Add stake")
- [ ] `features/staking-start` (F8: account radio w/ modes, signing path section, network segmented, amount + min bond,
      reward destination; step 2 = validator-selection; then buildBondNominate confirm→sign→submit or draft)
- [ ] Drawer/KPI/claim-modal action wiring; one-flow-at-a-time guard; positions pending-draft chip from drafts store
      scope
- [ ] Model/integration tests per flow (fee gating, draft branch, multisig deposit surfacing, min-bond boundary)

### Phase 5 — e2e validation (Playwright, at the end)

- [ ] empty → Start staking → validators → sign; KPI vs table consistency; claim select→sign→toast→unclaimed drops;
      multisig claim → 2/3 path; watch-only → no actions; unbond below-min warning; redeem; 25 positions scroll; chart
      toggles; draft toast → View drafts navigation

## User decisions on flags (2026-07-27)

1. Node version — dropped. **BLOCKS — resolved by research into `/Users/stepanlavrentev/apps`**: polkadot-js apps does
   NOT show blocks-per-era. It shows (a) `imOnline.authoredBlocks(currentSessionIndex, stash)` — блоки за ТЕКУЩУЮ
   сессию, зелёный бейдж "Produced blocks" (`page-staking-async/src/Validators/index.tsx:46` via
   `api.derive.imOnline.receivedHeartbeats`; historical only via archive `.at(hash)`,
   `page-staking/src/Query/useBlockCounts.tsx:29`, dead code); (b) "last #" = номер последнего произведённого блока за
   время работы вкладки (live `subscribeNewHeads`, `react-hooks/src/ctx/BlockAuthors.tsx:39`, НЕ счётчик). Конвертации
   points→blocks в репо нет. **Decision**: `blocksAuthored` in `EraValidator` via runtime probe on the timeline (relay)
   chain — if `imOnline.authoredBlocks` exists → exact per-session count (one `.multi` over elected set, column labelled
   "blocks this session"); else → derived estimate `round(eraPoints / 20)` with tooltip that it's derived from era
   points (upper bound: era points also include para-validation). "0 blocks" warning = 0 in whichever source. Both paths
   keep ERA PTS column exact.
2. Claim flow drafts: use the app-wide draft-mode pattern (`createDraftModeBinding` slider — modal switches to draft
   mode; either sign txs OR create drafts, never mixed in one confirmation).
3. "Add stake" = F7 layout via parameterized AmountFlowModal {unbond|addStake}. Approved.

## Runtime verification (browser, 2026-07-27)

Drove the renderer at https://localhost:3000 against the existing dev wallet (`parrent`, no staking positions).

- **New Staking dashboard tab renders correctly** — matches design frame F3 (first-time empty): KPI cards show zeros and
  `—`, NOT skeletons (data is loaded, just empty); the Unbonding/Unclaimed footers are correctly absent; the positions
  panel shows the icon, "No staking positions yet", the multisig/Address-Book explainer, `Start staking` and
  `Learn how staking works`; the rewards card shows the asset toggle, `0 DOT ≈ $0 · last 30 days` and the empty-history
  text.
- **Multi-chain fix confirmed visually**: the rewards asset toggle offers **DOT / KSM / WND** — Westend appears because
  it is in the dev chain config, which is exactly what the old hardcoded pair dropped.
- **No runtime errors.** Only pre-existing effector `$fee → *` skipVoid warnings, which also fire on untouched flows.
- **Old `/staking` page still renders** after `features/staking` was deleted — network selector, totals and the accounts
  list all fine, so the picker swap caused no regression.
- ⚠️ **A washed-out, right-shifted first screenshot was an automation artifact, not a bug**: the automated tab reports
  `visibilityState: "hidden"`, so `requestAnimationFrame` is throttled and the Tabs carousel spring freezes
  mid-transition (panel opacities summed to exactly 1.0). Untouched Governance froze the same way. Forcing the settled
  transform rendered everything correctly. Do not "fix" this.
- **Not verified in browser**: the validator-selection modal, and frames F5/F6/F7/F10 (claim drill-down, position
  drawer, unbond, draft toast). All need a funded staking account — this dev wallet holds 1.13 DOT against a 250 DOT
  minimum bond. Covered by 73 unit/model tests plus a render smoke test; real visual conformance is Phase 5 e2e work.

## Phase 5 — e2e ✅ (commit 85a1a91b6) — 6 tests, all passing against live chains

Pattern follows `cases/dashboard`: watch-only wallets holding **real, verified** funded addresses; no keys, no signing.
Test accounts (queried from Polkadot Asset Hub directly, era 2244 — not guessed):

- `13Xo4xYdMRQQoWD7TA9yCDHG1BXqQFvnjeGvU6LHhRhUsBhQ` — 8.1M DOT, **16 nominations** (chain max), exposed by 9 validators
  → Active.
- `12G1TaAHobt2qZ1zAPVmF122NrTMCDpC4nXuubddkQjTiScD` — 1.2M DOT active + **a 500K DOT chunk matured at era 1402** →
  exercises the unbonding footer, the withdrawable chip and the Redeem drill-down. Live chain also confirmed the
  design's numbers are real: `maxExposurePageSize` 512, `minNominatorBond` 250 DOT, `bondingDuration` 28 eras. Covered:
  S1 populated KPI row + positions row (Active pill, `N of 16`, share %), S2 drawer watch-only variant (asserts the
  **absence** of every action chip + the data-only note), S3 rewards chart controls, S4 KPI breakdown modals, S5
  unbonding footer → positions/unbonding drill-down, S6 empty state (zeros not skeletons, no `.spektr-skeleton`, CTA
  present). Assertions are shape-based (regex/counts), never live amounts.

**Uncovered by e2e, and why** — a watch-only wallet cannot sign and no funded signing wallet exists: F7
unbond/add-stake, F8 start staking, F10 draft toast, the validator-selection modal, and the action half of the positions
drill-down (all reachable only from action chips watch-only never renders). F5 claim drill-down is _not_ signing-blocked
but both live stashes currently have zero unclaimed payouts, so it would only show its empty message — worth adding once
a stash with pending payouts is picked. Multisig/draft rows, CSV export and the 20+ row sticky scroll need fixture
wallets a single-account watch-only profile cannot produce.

**Test hooks the app is missing** (reported, not hacked around): no `TEST_IDS.STAKING` block, so KPI
headline/subline/footer are reached as nth `> div` children; the rewards-chart total line is unselectable; staking
modals all share the ui-kit default `Modal` testid; and the dnd-kit wrapper puts a `role="button"` around every widget
whose accessible name concatenates its contents, forcing `exact: true` on in-widget role queries.

## Fixed: numeric zero vanished from the UI (commit 77ba6df48)

`shared/ui/Typography/common/TextBase` bailed on `!children`, so a **numeric `0` rendered nothing**. The
Active-nominations KPI passes a raw count, so the empty dashboard showed a blank where "0" belongs. Narrowed the guard
to `null | undefined | '' | false` — every other case keeps its current behaviour — and added the first tests for
`TextBase` (7 cases). Whole suite (2565) green after the change.

## Found bug in the OLD flow — needs a decision (not fixed; that page is out of scope)

`features/staking-unstake` chills at `leftAmount.lte(minBond)` — `model/form-model.ts:218`, `:349`,
`model/form-model-shards.ts:357`. Unbonding down to **exactly** the minimum bond leaves a still-valid nominating
position, so wrapping `chill` there drops the user's nominations for no reason and they stop earning until they
re-nominate. The new `staking-amount-flow` uses strict `<` (plus "a full unbond always chills, even when the minimum is
unknown"). The fix is `lte` → `lt` at three sites; no test encodes the current behaviour. Left untouched because the old
Staking page was explicitly scoped out — needs a go-ahead.

## Verification per phase

`pnpm types:go` + affected unit suites + `pnpm test:integration` staking cases; renderer runtime check via `verify`
skill (browser-drive) after Phases 2–4; e2e suite in Phase 5; feature-map check `pnpm check:feature-map`.

## Review pass — logical inconsistencies and bugs (2026-07-28)

Seven parallel read-only reviewers over the branch diff (domain, aggregates, KPI, positions+chart, flows,
validator-selection, shared). Every finding below was re-verified against the code before acting on it.

### Fixed

**Money paths**

1. `staking-claim-rewards/lib/plan.ts` — **cross-account duplicate payout call.** `payout_stakers_by_page` pays every
   nominator on the page, so two stashes backed by the same validator in the same era produced two identical calls; the
   second reverts `AlreadyClaimed` and, inside a `BATCH_ALL`, takes up to 9 valid payouts with it. Dedup now spans the
   session (`buildClaimPlans`), while `$totalAmount` still sums the requests — the dropped call's money is paid by the
   one that was kept. `groupRequestsByAccount` also keys on chain + account, not account alone.
2. `payouts/subquery.ts` + `payouts/service.ts` — **indexer failure was reported as "nothing to claim".** A failed or
   schema-rejected response returned `[]`, which `getUnclaimedPayouts` published as `source: 'subquery'`, total `0` over
   the full `historyDepth`. Now returns `null` on "no source answered" and falls through to the bounded chain scan.
3. `payouts/service.ts` — **a failed `claimedRewards` chunk read as "no page claimed"**, overstating the total and
   generating extrinsics the runtime rejects. Unanswered `(era, validator)` keys are dropped from the candidate set.
4. `staking-claim-rewards/model/claim.ts` — `rewardsClaimed` announced the full amount when only some chunks landed.
   Built from the plans whose submit result actually succeeded.

**State / correctness** 5. `dashboard-staking-positions/model/position-actions.ts` — **Critical.** Cleared the shared
`validatorSelectionModel` on _every_ `formSubmitted`, including submits from the Staking page's bond-nominate/nominate
flows, so Back from Confirmation reopened the picker with no chain, asset or selection. Clearing now hangs off
`changeValidatorsClosed`. 6. `domains/staking/staking/resource.ts` — chain-keyed ledger cache **replaced** rather than
merged, so two live subscriptions with different account sets erased each other's positions. 7.
`aggregates/staking-positions/model.ts` — `$pending` accepted a ledger map from a previous account set as an answer; a
wallet switch rendered the empty state instead of skeletons. 8. `validators/service.ts` — **the slash defer window was
walked backwards.** `UnappliedSlashes` is keyed by the era a slash becomes _applicable_, so pending slashes sit ahead of
the active era; the backward scan was empty by construction and left `slashed` permanently false on every staking-async
runtime (i.e. every chain this targets). Also guards `lastNonzeroSlash === 0`, which flagged every validator on a chain
younger than the defer duration. 9. `domains/staking/rewards/resource.ts` — cache key omitted the account set while the
request key included it, so a selection change served the previous set's map and rendered a settled `0` for the new
account.

**Validator selection** 10. A nominated validator that later turned `blocked` could not be deselected — the toggle guard
rejected both directions. Removing is now always allowed. 11. "Fill with recommended" clicked while the elected set was
loading replaced the selection with `[]`, silently wiping the user's current nominations. 12. The default `hasIdentity`
filter emptied the whole table while identities were still resolving, and the "Clear search and filters" escape hatch
reset to those same defaults — a dead end. Identity bounds are inert until identities are known; the escape hatch clears
to `OPEN_FILTERS`. 13. Tri-state sort made the _default_ column untoggleable (APY here, Staked in the positions table)
and teleported other columns back to the default on the third click. `null` now folds onto the same column ascending.
Both tables.

**Presentation honesty** 14. `dashboard-staking-kpi` — the "show fiat" setting was threaded through two layers and never
read; the cards now lead with token amounts when fiat is off. 15. Expiry countdown assumed one era ≈ one day when the
era anchor was missing — on Kusama (6 h eras) that reported a reward expiring in three weeks as 84 days away, coloured
green. Returns `null` instead. The claim window now uses the runtime `HistoryDepth` (matching the eras actually scanned)
instead of a hardcoded 84, and is inclusive of its oldest era. The tooltip no longer claims a day count it cannot
derive. 16. `PositionDetailDrawer` asserted "Nothing to claim on this position" while the payout scan was still
running. 17. Donut centre rendered an unknown APY as a confident `0.0%` while the row's own cell said `—`. 18. Two fiat
summation engines (BigNumber in the cards, float `reduce` in the modals) could disagree on one set of rows. 19. Row and
drawer rendered the same expiry as "expires now" vs "0d left" — one shared helper now.

**Shared** 20. `shared/lib/csv` — CSV formula injection (`=`, `+`, `-`, `@`, tab) was passed through verbatim into a
file the user opens in Excel; added neutralisation plus a UTF-8 BOM so non-ASCII wallet names are not mojibake. 21.
`Modal`/`Drawer` — `hasTitle` compared `Array#find` against `null`, so it was unconditionally true and the a11y fallback
title was unreachable. 22. `TextBase` — the zero-rendering fix let `NaN` through as literal text; skipped again. 23.
`Table.css` — the selected-row accent bar used `box-shadow` on a `<tr>` under `border-collapse: collapse`, which
Chromium does not paint; moved to the first cell. 24. `csvFileName` stamped the UTC date, filing a late-evening export
under tomorrow.

### Reported, deliberately not fixed here

- **`oversubscribed` is wrong on paged exposures** (`exposures/service.ts:98`). `MaxExposurePageSize` is a page chunk
  size, not a reward cutoff — every page is payable via `payout_stakers_by_page`. Today it produces a false badge, an
  unjustified default recommendation exclusion, and an unreachable-correct `statusReason: 'oversubscribed'`. Fixing it
  is a product decision (drop the flag vs redefine it as a "large validator" hint) — needs a call.
- **The recommender ranks purely by APY** while the criteria popover claims "Scored on commission · self stake · block
  production · era points". Either the copy or the algorithm is wrong; `getScoreBreakdown` exists but only feeds the
  "Why recommended" card. Product decision.
- **`resolvePayoutPages` prefix-reads a whole era of exposures per era** (~600 entries × up to 84 eras) to learn
  `pageCount` for at most 16 validators. Needs an exact-key `erasStakersOverviewFor` in the pallet layer, mirroring
  `erasValidatorPrefsFor`.
- **Extra claim transactions are unvalidated.** Validation and `$canSign` are bound to the primary plan only, so a
  second, watch-only or fee-short account reaches the vault screen. `$totalFee` also sums across different payers.
- **Draft mode builds the call for the picked address-book source** while the screen still describes the opened position
  (`staking-amount-flow`, `staking-confirm-flow`). `staking-unstake` swaps the displayed stake in draft mode; these do
  not.
- **`resolveAccount` picks the first `accountId` match** regardless of wallet or signability, so a watch-only duplicate
  can capture a KPI-originated action.
- `validatorsResource`/`apyResource` caches are not gated on era (brief stale data at rollover);
  `aggregates/staking-validators` reads a resource it never starts; `$exposurePagesCache` is unbounded with
  `staleAfter: Infinity`; `Drawer` is a near-verbatim copy of `Modal`; `Table` sorting has no `aria-sort`/keyboard path;
  three `dashboard-staking` widgets and their hook tail are now orphaned.
- The old Staking page's `lte`-vs-`lt` chill boundary (recorded above) is still open.

**Verification:** `pnpm types:go` clean, 2616 unit tests, 223 integration tests, `check:feature-map` OK (132 modules),
eslint 0 errors on the changed files.

## Follow-up decisions (2026-07-28)

Two of the open items from the review pass above were resolved by the user; the other two were left as they are.

### 1. `oversubscribed` — flag removed (decided: remove, not redefine)

`MaxExposurePageSize` is the size of one exposure page, not a reward cutoff: every page is payable through
`payout_stakers_by_page`, so a validator with more backers than one page holds is spread over several pages rather than
paying its tail nothing. The flag was therefore false in substance everywhere it appeared, and it drove three real
behaviours — a warning badge, a default-on recommendation exclusion, and an `inactive` position's stated reason.

Removed end to end: `EraValidator.oversubscribed`, the legacy `Validator.oversubscribed`,
`exposureService.checkOversubscribed`, the `excludeOversubscribed` criterion (persisted payloads that still carry the
key hydrate fine — flags are read key by key), the `hideOversubscribed` table filter, the row badge and its risk copy,
and the `'oversubscribed'` `PositionStatusReason`. `nominatorCount` and `maxNominatorsRewarded` stay: the `412 / 512`
cell is a fact, it just no longer implies a penalty, and the red text is gone.

`deriveStatusReason` now answers `notElected` / `notExposed` only — which is what it could honestly distinguish anyway,
since exposure pages are flattened across all pages before the stash is looked for.

### 2. Recommendation ranking — composite score (decided: APY leading, four metrics adjusting)

`recommendValidators` ranked purely by APY while the criteria popover claimed it scored on commission, self stake, block
production and era points. Fixed the algorithm rather than the copy.

Ranking is now the weighted blend in `SCORE_WEIGHTS`: APY 0.4, commission 0.2, self stake 0.15, block production 0.15,
era points 0.1. APY leads because it is the return being bought, but it no longer decides alone — a headline APY earned
behind a 20% commission now loses to a cheaper, better-run validator. An unknown APY scores 0 on that metric instead of
sinking the validator outright, so the other four still speak for it.

- `ScoreBreakdown` gained `apy` and `overall`; `getScoreBreakdown` is the single source for both the ordering and the
  "Why recommended" card, so the bars a user reads are the numbers that produced the pick.
- The card leads with an `Overall` row above a divider, then the five metrics.
- Popover copy now reads "Ranked by estimated APY, commission, self stake, block production and era points."
- **Perf:** scoring every validator against every other is quadratic, and `ownStake` is a planck string, so the naive
  form re-parsed ~600 BNs per validator. The normalisation maxima are now computed once per candidate set
  (`createScorer`) and closed over.

Tests: the old ordering cases still hold (with everything else equal, APY decides) and four new ones pin the blend — a
cheaper validator outranking a higher APY, a clearly better APY still winning when the rest is close, ranking with no
APY known at all, and `overall` being exactly the weighted sum.

### 3. Extra claim transactions unvalidated — left open, as agreed.

### 4. Draft mode using the picked address-book source — reviewed and accepted as correct behaviour; no change.

**Verification:** `pnpm types:go` clean, 2616 unit tests, 223 integration tests, feature-map OK (132 modules), eslint 0
errors on changed files, every static `t()` key resolves.

## Era points and the Blocks column (2026-07-29)

Reported from the running app: every validator showed `Era pts 0` and `Blocks —`. Two separate causes, both verified
against live Polkadot / Polkadot Asset Hub rather than reasoned about.

### Era points — the active era is the wrong era to read

`getEraPoints` read `erasRewardPoints(activeEra)`. On staking-async runtimes the relay reports points to the staking
chain **per session**, not per block. Measured on Polkadot AH by replaying historical blocks:

| observed at          | activeEra | points for that era     |
| -------------------- | --------- | ----------------------- |
| 30 min into era 2246 | 2246      | `total=0`, 0 entries    |
| 4.5 h into era 2245  | 2245      | 34,323,140              |
| 12.5 h into era 2245 | 2245      | 43,003,140              |
| era 2245 closed      | 2245      | 51,716,660, 599 entries |

So the active era reads `0` for its whole first session — four of every twenty-four hours on Polkadot — and is a partial
tally the rest of the time. Fixed by reading the last **completed** era (`era - 1`), which is complete and identical for
everyone; that is also what the design's "last era" wording already implied.

polkadot-js apps has the same bug: `api.derive.staking.currentPoints` is `erasRewardPoints(activeEra)`
(`@polkadot/api-derive/staking/currentPoints.js`), so its staking-async page shows the same zeros. Not a pattern to
copy.

### Blocks — `imOnline` no longer exists

The column needed `imOnline.authoredBlocks` on the timeline chain. Probed both ends: `imOnline pallet present: false` on
the Polkadot relay (spec 2003002) **and** on Polkadot AH. The pallet was removed from the runtime, so the column could
only ever render `—`.

In `../apps` "Produced blocks" is the same dead path — `api.query.imOnline.authoredBlocks(currentSession, stash)`, gated
behind `!!(api.query.imOnline?.authoredBlocks)` so the badge simply never renders. The other block-related thing there,
`byAuthor` in `react-hooks/src/ctx/BlockAuthors.tsx`, is the _number of the last block_ a validator authored while the
tab was open (from `subscribeNewHeads`), not a count — not what this column means.

**The fallback recorded earlier in this file — `round(eraPoints / 20)` — was rejected.** Live data kills it: an era pays
~51.7M points across 599 validators (~86k each), while a day holds ~14,400 blocks in total. Era points are dominated by
para-validation (backing/approval), not authoring, so any points-to-blocks ratio would be invented.

**Decision (user): remove the column, move its weight to era points.** Removed `EraValidator.blocksAuthored`,
`getAuthoredBlocks`/`resolveAuthoredBlocks`/`getCurrentSession`, the table column and its sort key, the detail row, the
`blockProduction` score and the `blocksUnavailable` string. `SCORE_WEIGHTS` is now APY 0.4 / commission 0.2 / self stake
0.15 / **era points 0.25** (0.10 + the 0.15 that was block production) — still sums to 1, so `overall` can reach 100%
again. The "hide idle" filter now means "earned no reward points last era" instead of "authored zero blocks".

This also explains the `Overall 70%` in the screenshot: with era points 0 and blocks unknown, two of five metrics were
structurally dead and the composite could not exceed 0.75.

**Verification:** `pnpm types:go` clean, 2610 unit tests, 223 integration tests, feature-map OK, eslint 0 errors, every
static `t()` key resolves.

## Staking page: "Select accounts" permanently disabled (2026-07-29)

Reported from the running app: on the old `/staking` page the actions control read "Select accounts" and was greyed out,
with no way to select anything.

**The button is not a picker.** `pages/Staking/ui/Actions.tsx` renders the operations dropdown; "Select accounts" is the
label it falls back to when `stakes.length === 0`, meaning "tick an account in the list below first". Its `disabled` is
`isStakingLoading || noStakes || wrongOverlaps`.

**Why nothing could be ticked.** `NominatorItem.tsx:44` renders the row checkbox only when `nominatorsLength > 1` — with
a single account there is nothing to choose between, so the selection is meant to be automatic. That automatic selection
was a `sample` in `aggregates/staking-accounts/model.ts` clocked on `stakingNetwork.$selectedChainId` and
`walletSelect.$selectedWallet`, reading `$accountIds` from `source`.

`$accountIds` fills in asynchronously — `$accounts` combines `walletSelect.$selectedAccounts` (wallet accounts from
storage) with `stakingNetwork.$chain` (from the network config). At startup both clocks fire while `$accountIds` is
still `[]`, the fn computes `[]`, and **nothing ever recomputes it** when the accounts land: the account list is not a
clock. Single-account wallet ⇒ no checkbox ⇒ no selection ⇒ every staking action disabled, permanently.

**Fix — the selection is derived, not sampled.** `$pickedNominators` now holds the user's explicit ticks;
`$selectedNominators` is a `combine` of that with `$accountIds` and the active wallet. It keeps an explicit pick as long
as those accounts still exist on this wallet and chain, and otherwise falls back to `getDefaultSelection`. Being
derived, it recomputes with the account list by construction — the whole class of "clocked before the data arrived" is
gone, which also matches the repo's effector guidance ("the less the sample, the better").

`getDefaultSelection` also replaces the old wallet-type whitelist, which was a denylist by omission:

- exactly one account → select it, whatever the wallet type (nothing to choose between);
- several accounts on a wallet that signs with exactly one (multisig, proxied, WalletConnect/Nova, the three extensions)
  → the first, as before;
- multishard vault → nothing, the user picks via the checkboxes the rows do render.

The old code also had `[accountIds[0]!]` on a possibly-empty list, which would have produced `[undefined]`.

**Test gap, stated plainly.** `model.test.ts` covers `getDefaultSelection` directly (12 cases). The store-level path is
_not_ covered: `$accounts` runs through `accountService.isAccountAvailableOnChain`, whose DI `anyOf` registry resolves
empty under `fork()` unless handlers are seeded in-scope (the pitfall already recorded for the transfer-myself-xcm
test). Seeding that here was more plumbing than this out-of-scope page warranted; the recompute-on-arrival property is
structural to `combine` rather than something the sample-based version got wrong by degree.

**Not verified in the browser.** Worth a click-through on a single-account wallet before merging.

**Verification:** `pnpm types:go` clean, 2622 unit tests, 223 integration tests (one pre-existing flake in
`fellowship-evidence`, a 15s timeout, passes on rerun), eslint 0 errors.

## Recommendation score surfaced in the UI (2026-07-29)

Follow-up to the composite ranking: the score existed but only the recommended validators ever showed it, and only as
percentage bars in a card at the bottom of the detail pane.

- **Score column** in the validator table, sortable, placed right after Validator. Also fixes the layout: removing the
  Blocks column had left the percentage widths summing to 88%, so the remaining columns stretched. Back to 97% + 48px.
- **`7/10` instead of `NN%`** everywhere the score shows. It is coarse enough to compare at a glance and honest about
  the precision of the underlying number — every metric is normalised against whoever happens to be elected this era.
- **Colour: grey / amber / green** (`getScoreTone`, thresholds `SCORE_FAIR = 4`, `SCORE_GOOD = 7`). Grey rather than red
  at the bottom on purpose: a low score means "there are better validators this era", not "this one is unsafe" — the
  unsafe cases (slashed, blocked) carry their own badge.
- **"Why recommended" card → "Recommended score" row**, moved to the top of the detail pane above Estimated APY. The
  four contributing metrics now live in its tooltip instead of a separate card.
- **Shown for every elected validator**, not only the recommended ones — "how does the one I picked myself compare" is
  the question the detail pane is open for.

Two things worth recording about how it is computed:

- Scores are normalised against the **whole elected set**, not the filtered view, so a row's score does not move as the
  user types into the search box. `$scores` is one `getScoreBreakdowns` pass over `$validatorList`; scoring per row
  would rebuild the normalisation reference each time (quadratic over ~600 validators, re-parsing every self stake as a
  BN each rebuild).
- `$clusterPositions` now walks **score order** rather than APY order. That is the order `recommendValidators` itself
  walks when it caps a cluster, so "3rd in cluster" names exactly the rows the cap dropped — previously the badge was
  numbered by a different order than the rule it describes.

**Verification:** `pnpm types:go` clean, 2631 unit tests, 223 integration tests, eslint 0 errors, every static `t()` key
resolves. `debug-globals.test.ts` fails intermittently at suite level in full runs and passes in isolation and on rerun
— pre-existing flake, unrelated.

**Not verified in the browser** — the column widths and the tooltip in particular are worth a look.

## Validator picker polish — 2026-07-30 (feature complete)

Nine commits (`e5cf9248f` … `f9390e509`) closing out `features/validator-selection`. All verified in the running
renderer against Polkadot Asset Hub era 2,246, not only by tests.

### Score presentation

- **Tooltip was broken, not just ugly.** `Tooltip.Content` in ui-kit is capped at `max-w-48` (192px); the inner block
  was `w-56`, so the right-hand values rendered _outside_ the dark background. Width now set on `Content` itself
  (precedent: `AccountSelectorSwitcher`), verified 240px in the DOM.
- **Placement.** Default `side="top"` had nowhere to go — the pane hugs the modal's right edge, so the tooltip flew onto
  the table header. Now `side="left" align="start"`.
- **Per-metric bars are hand-rolled, not `Progress`.** That component is themed for light surfaces: its track is a
  6%-alpha ink that vanishes on the dark tooltip and its blue fill barely separates from it. Bars fill from the
  _rounded_ score so the bar never disagrees with the number beside it.
- **"Recommended score" → "Score"**, with an info icon, and the whole `DetailRow` is the tooltip target — the reader is
  looking at the number when the question occurs to them. Wrapper is `div tabIndex={0}` (project precedent
  `BondForm.tsx`), because `DetailRow` renders `dt`/`dd` which cannot live inside a `button`.

### Self stake scored on a log scale

Linear normalisation against the largest stake is the wrong operation for a quantity spanning orders of magnitude: one
PAH operator self-bonds ~1.1M DOT while most sit at the 10k minimum, so **every ordinary validator collapsed to 0/10**.

Now `log1p(stake / minStake) / log1p(maxStake / minStake)` — unit-free (a ratio, so the answer does not depend on planck
vs DOT) and meaningful: how far above the era's floor the operator went. 10k → 1/10, 20k → 2/10, 100k → 5/10, 1.1M →
10/10.

- **Behaviour change worth knowing:** `selfStake` used to be ~constant (0 for nearly everyone), so its 0.15 weight did
  nothing and the ranking was effectively APY + commission + era points. It now discriminates, and recommendation order
  shifts slightly.
- One test was rewritten rather than re-run: "distinguishes stakes a planck apart" guarded BN exactness. Ratios are now
  computed in a double, so such stakes score identically — 1e-10 DOT of difference in a value rendered in ten buckets.
  Replaced with the opposite assertion plus a comment; large-planck precision kept under its own test.
- `SCORE_PRECISION` deleted (unused).

### Blocked validators are inspectable

`rowProps` passed `disabled: blocked`, and `Table` drops the row's click handler on that flag — so a blocked validator
was the one row in the table that could not be opened, hiding exactly the numbers that explain _why_ it is blocked. Row
`disabled` removed; the checkbox stays inert (the model already rejects the toggle, tested) and explains itself on
hover. **A validator that turns blocked after being nominated keeps a working checkbox**, so the hint is suppressed when
already ticked — it would be lying about a control that works.

Side effect: blocked rows lost the 50% opacity that came with `disabled`. Deliberate — the row is interactive again, so
it should not look inert; the BLOCKED badge and the greyed checkbox carry the meaning.

### Explanations moved from a card into tooltips

The "Worth knowing" card sat below the fold, described only the single flag of the one open validator, and said nothing
in the table where the badge is first read. Every badge now carries its own hint (`badgeHint.*`), in the table and the
pane alike. `risk.*` renamed to `badgeHint.*` — with the alert gone these explain badges, and `risk.elected` would have
been a straight falsehood. New `elected` hint written from staking-pallet semantics.

Also: `LOCAL WALLET` chip dropped (kept for watch-only/draft, which change what the user can do), title → "Choose
validators", REC badge dropped, `ON-CHAIN IDENTITY` → `Identity`, fiat added under Own stake.

### APY tooltip carries the formula

The two-step computation in `apy/service.ts` reduced to one expression — `totalStaked` and `avgStake` cancel:

    APY = (era reward ÷ validators) ÷ this validator's total stake × eras per year × (1 − commission)

Verified numerically against the two-step form. The reduced shape also _shows_ why a smaller validator pays more, which
the intermediate steps hide.

**PAH and KAH use the same code path.** The only differing term is eras per year — 365 (24h eras) vs 1,461 (6h). No
branch is needed because `getAvgRewardPercent` reads the realized `erasValidatorReward`, so Polkadot's fixed inflation
and Kusama's NPoS curve are already inside the number.

### Operators that number their root identities

`buildIdentityParents` grouped on the **exact** display name. That works for sub-identities (a sub carries its parent's
name, so `EXNESS.COM/0…5` all read `exness.com`) but missed operators who skip subs entirely: `BINANCE_STAKE_1…14` on
PAH read as fourteen unrelated operators, and the whole family walked past the two-per-operator cap.

Logic moved out of the aggregate into `domains/staking/recommendations/clusters.ts` — a pure identity→operator rule
belongs in the domain; the aggregate keeps only the `combine`. Both consumers already read `$identityParents`.

Two conditions, and **the second does the work**:

1. Levenshtein distance ≤ `MAX_OPERATOR_NAME_DISTANCE` (3) — an index that grew a digit, a swapped separator, a case
   change.
2. The shared prefix covers **more than half** the shorter name.

Distance alone is not a test of anything, and my own test caught it: `dotkeeper`/`zugkeeper` are 3 edits apart and are
two operators who both liked the word "keeper"; `dot1` is 3 edits from `ksm1`. What marks a numbered family is _where_
the difference sits — shared stem, varying tail — which is what the prefix rule tests.

Merging is transitive (union-find), so `node-a → node-b → node-c` is one cluster. That is also how it could over-merge
if a long chain bridged two real operators; the prefix rule keeps the steps too short for that on real identities.

Comparison runs over **distinct names**, not 600 validators, with a length prefilter and an early-exit Levenshtein — 600
distinct identities cluster in 10ms.

**Live result:** Binance 0 → 12 cluster badges (14 validators − cap of 2); total badges 100 → 117. Clustering the real
PAH identity list produced exactly Binance 14 / EXNESS 6 / BRC 5 / Figment 3, leaving `DotKeeper`, `LXLXLX`, `P2P.ORG`,
`AZIMUT`, `Zug Capital`, `MileBravo`, `ROTKO.NET/dot01` each on their own.

**Two fixtures were wrong, not the code.** `Operator 1…20` (aggregate) and `Operator A…E` (integration) were written to
mean "all different operators" and are now correctly read as one operator numbering its nodes. Replaced with genuinely
unlike names, verified pairwise against the rule, with a comment explaining why "merely distinct" is not enough.

### Verification

`pnpm types:go` clean · **2654 unit tests** (2 files skipped) · **223 integration tests** · eslint 0 errors · every
change exercised in the running renderer.

### Still open (unchanged from earlier passes)

- Extra claim transactions unvalidated — `$canSign` is bound to the primary plan only. Deferred by the user.
- `resolvePayoutPages` full-era prefix reads; `resolveAccount` picks the first match regardless of signability.
- `validatorsResource` / `apyResource` caches are not era-gated; `$exposurePagesCache` is unbounded.
- `aggregates/staking-validators` never starts the resource it reads.
- Table a11y: no `aria-sort`, no keyboard row activation.
- Orphaned `dashboard-staking` widgets; the old Staking page's `lte`-vs-`lt` chill boundary.

## Dashboard pass — permanent loading skeleton on a mixed account selection (2026-07-30)

### The symptom

Dashboard → Staking sat in skeletons forever with the user's own selection (All 154). All four KPI cards and the whole
positions table, permanently — not slow, never resolving.

### Root cause

Found by attaching to the running Electron over CDP and reading the live stores (the app had no debug port; relaunched
with `--remote-debugging-port=9222` and driven through a dependency-free CDP client).

The fingerprint: all three chains `CONNECTED`, active eras known, yet every chain's ledger map **existed and was empty**
(`ledgerKeys: 0`, `coveredOfRequested: 0`) → `$pending` true forever.

The chain: one address-book row in the selection was a 20 byte Ethereum-style id
(`0x9f56c5a609ebb39982064da081d78aa429928b64`; 21 of the 154 selected entries are EVM addresses). Tracked ids bypass the
chain-availability check by design, so it joined Polkadot AH, Kusama AH and Westend AH. Then:

1. `staking.bonded.multi([...4 substrate ids, 1 EVM id])` throws
   `Invalid AccountId provided, expected 32 bytes, found 20` — **one unencodable key rejects the whole batch**.
2. `getControllers` caught it and returned `[]`.
3. `listenToLedger` subscribed to an **empty** key list, whose callback fired with `[]`.
4. `buildStakingMap` reduced that to `{}` → the chain-keyed cache stored a _defined but empty_ map.
5. `$pending` requires the map to cover every requested account → never satisfied, on every chain at once.

Wallet accounts were never the problem: `isAccountAvailableOnChain` correctly keeps the wallet's own EVM keys off the
Asset Hubs. Only tracked ids skipped it.

### Fixes

- **`aggregates/staking-positions/model.ts`** — a tracked id now joins only chains whose key scheme can hold it, via the
  already-exported `accountService.isAccountSchemeMatchChain(accountId, chain)`. The full availability check still
  cannot run on a bare address (no chain binding), but the _scheme_ is a property of the `AccountId` itself.
- **`domains/staking/staking/service.ts`** — `getControllers` no longer swallows a failure into `[]`, and the
  `buildStakingMap` catch no longer calls back `{}`. Both fabricated "none of these accounts are bonded", which is not
  just a hang: the same chain-keyed cache feeds the unstake/withdraw/restake forms and their validations.

### Verified at runtime

Forced the exact poisoned tracked set back through `trackAccountIds` after the fix: the EVM id stays tracked but is
dropped per chain (`ethIncluded: 0`), coverage completes 4/4, 4/4, 3/3, `pending: false`, one real position derived. The
KPI row rendered $10.39M staked / 2.9% APY / 9 nominations / $22,025.76 rewards where it had shown skeletons.

### Deliberately not changed

- `stakingService.fetchStakingLedger` still returns `{}` when `buildStakingMap` throws. Same fabrication, but the two
  callers (withdraw validation, basket confirm) would start seeing a rejection instead; changing their behaviour belongs
  with a pass that can verify those flows.
- **`$pending` cannot tell "failed" from "loading".** The pooled resources carry no error state, so _any_ subscription
  that fails leaves a permanent skeleton. Documented in the aggregate README as a known gap; closing it needs an error
  signal in `shared/query`, which is the redesign already flagged there.

### Dead code in `features/dashboard-staking` marked, not deleted

Per the user: mark deprecated now, delete once the staking tab is fully migrated. 13 of the feature's 17 modules are
unreachable — only `StakingSummaryWidget → Price, useStakingOverview → useActiveValidatorCount` is live (the Overview
tab's summary card). The three widgets this feature used to inject into `dashboardStakingSlot` on `dev`
(`StakingOverviewWidget`, `TotalRewardsWidget`, `MonthlyRewardsWidget`), their detail modals, `ChainAllocationChart`,
`ChartTooltip` and five hooks now carry `@deprecated` with a pointer to the replacement; `index.ts` documents the live
graph and the deletion trigger. `useMonthlyRewardsChart.test.ts` still runs and is labelled as covering a deprecated
hook.

Open question left for the user: whether the old modals held behaviour the new widgets do not reproduce (per-chain
allocation, the nominated-validator list). That decides when the set can go.

### Rewards chart: value labels on every bar (2026-07-30)

The numbers appeared and vanished with the pointer because value labels were gated on
`shouldShowValueLabels(bucketCount)` against `LABEL_LIMIT = 13`. Bucket counts are 7d=7, **30d=30**, 90d=13, 1y=12 — so
labels were hidden on exactly one range, `30d`, which is `DEFAULT_RANGE`. On that range the only copy of a number was
the hover card, and the chart dimmed the non-hovered bars to compensate.

Removed: the gate, `LABEL_LIMIT`, the hover-dimming fallback (`activeIndex` prop and the per-`Cell` `fillOpacity`, now a
dead branch — `fill` moved onto `Bar`) and the five tests covering the rule. The grey hover band from `Tooltip.cursor`
still marks the pointed-at bar.

Fixed alongside, in the same three lines: the label dropped `formatBalance`'s `suffix`, so a bucket of 13.56M DOT would
have been printed as `13.56`. Thousands are not shortened by default, which is why nobody noticed — millions and above
are.

**Density, measured not assumed.** At the current window all 30 bars label cleanly. Emulated at 1280 CSS px the adjacent
labels get tight (`955.89 953.38 951.25` run together with ~1px gaps) without overlapping; narrower would overlap, since
Recharts' `LabelList` does not skip colliding labels. If that becomes a problem the fix is compact labels — enabling the
`THOUSANDS` shorthand for the chart only turns `1,021.95` into `1.02K` and roughly halves the width, with the exact
amount still in the hover card. Not done: it changes how every range reads, which is the user's call.

### Numbers, not chrome: KPI footers and the flickering chart labels (2026-07-30)

**Two KPI chips removed.** `1 withdrawable` on Total staked and `EXPIRES IN 84D` on Rewards were squeezing the amounts
they sat next to into an ellipsis — `UNBONDING 1...` and `UNCLAIMED 0.9...`. Gone, and the amounts now read in full
(`163.79K DOT`, `0.94K DOT`). `withdrawableCount` never gated whether the footer renders, so nothing else moved.

Deleted with them: `ExpiryChip.tsx` (no other consumer), and `getExpiryUrgency` / `EXPIRY_LABEL_VARIANT` /
`EXPIRY_WARNING_DAYS` / `EXPIRY_CRITICAL_DAYS` / `ExpiryUrgency` from `dashboard-staking-kpi/lib/expiry.ts`, which
existed only to colour it, plus their tests and the two orphaned locale keys. The positions feature keeps its own
`getExpiryUrgency`, so the duplication is now down to one copy.

Nothing about expiry is lost: the claim modal still leads with "oldest expires in N days" (computed there from eras and
history depths) and the positions table still badges `83d left` per row with its own urgency colours and tooltip.

Left in place, now computed but unrendered: `unbondingFooter.withdrawableCount` and `unclaimedFooter.daysUntilExpiry` /
`historyDepth`. They are the domain answer, cheap, and tested; stripping them would also let `useStakingKpi` drop three
era hooks. Kept because "show the countdown as plain text" is a plausible next ask.

**Chart labels stopped flickering.** Even with labels unconditional, they blanked whenever the pointer entered a bar.
Measured with a CDP timeline over one hover: 5 labels idle → **0** from t+50ms to t+250ms → 5 again from t+350ms, with
Recharts' tooltip cursor active the whole time. Recharts does not render a `LabelList` while its bar animation runs, and
activating the tooltip re-runs that animation — so every bar the pointer crossed blanked the whole row for ~300ms. Note
the trigger was Recharts' own internal state, not our props: our hover card had not even opened in the probe.

Fix: `isAnimationActive={false}` on the `Bar` (replacing `animationDuration={400}`). Re-measured: 5 labels at every
sample across the hover. The cost is the 400ms grow-in on load and range switch. A hovered bar's own label still sits
under the hover card, which shows that same number larger, so it is not lost.

## New position assembled on the dashboard (2026-07-30)

### Scope, measured before deciding

Of the five staking actions a dashboard row offers, four already opened as modals over the dashboard — claim, add stake,
unbond, change validators, redeem, routed by `staking-dashboard-actions` into three flow features injected into the app
shell's `modalsSlot`. Exactly one still navigated: `startStakingRequested → Paths.STAKING`, i.e. **New position**
(bond + nominate). The user confirmed the scope as that one action, with the account chosen inside the flow.

### What was built

`features/staking-new-position-flow`, shaped like its two siblings:
`NONE → INIT → VALIDATORS → CONFIRM → SIGN → SUBMIT`, a modal shell in `modalsSlot`, a README spec, and tests. It owns
two fields the siblings do not need — **chain** and **account** — because a new position has no position to inherit them
from and the dashboard has no selected network.

Reused rather than rewritten: `bondNominateValidator`, `transactionBuilder.buildBondNominate`, `createSigningPathModel`,
`createComplexTxStore` / `createTxValidationStore`, `signModel` / `submitModel`, the drafts binding, and the validator
picker. Wiring: the `Paths.STAKING` sample is gone, `startStaking` is now gated on the new flow's own flag.

### Three defects the verification caught, none of which the unit tests would have

1. **`$minimumBond` was keyed by the requested `$chainId`, not the resolved chain.** A chain the config does not have
   falls back to the first staking chain, and the minimum then read as zero — "no floor" — letting a bond through that
   `staking.nominate` rejects. Caught by a unit test written against the real Polkadot minimum; fixed to key on
   `$chain`.
2. **Driving the flow over CDP was driving a duplicate module.** `import('/@fs/…/model/new-position-flow.ts')` returned
   a second evaluation with its own stores; the app's copy lives under an HMR-versioned URL. The "flow reached the
   validators step" reading was about nothing. Re-verified through the UI. Lesson recorded.
3. **The Continue button was unclickable.** `Modal.Content` wraps children in its own scroll area; the step brings
   another, so the card grew past its bounded height and the centring container clipped the footer away — the button
   rendered, measured fine, and sat under the overlay. Fixed with `disableScroll` + a bounded modal height, matching
   `ValidatorSelectionModal`.

### Verified end to end, in the running app

**New position** on the Staking tab keeps the hash at `#/dashboard` and opens the form; the account select lists the 132
accounts available on Polkadot Asset Hub; `Max` fills 343,323.86 DOT (reservable less the fee, priced from the
placeholder call before any real transaction exists); the minimum reads 250 DOT from chain; `Continue` moves to the
picker, scoped to that account and Polkadot Asset Hub, 600 validators at era 2,247. Signing is not exercised — the
session wallet is watch-only.

`pnpm types:go` clean · unit **2661** · eslint 0 errors · `check:feature-map` OK (133 modules, 43 documented).

### Left for the user

Payee, restake and chill are still Staking-page only — the dashboard offers no chip for them at all, so they were out of
scope by the user's own answer. Multishard Vault fan-out is not ported, matching the sibling flows.

## Four dashboard corrections (2026-07-31)

### New position: composition and "stake from"

Element order now follows the transfer flow — network → stake from → amount → rewards destination → fee. Deviating
per-operation makes two forms that ask the same questions feel like different applications.

**"Stake from" is the signing path itself**, not a dropdown beside it. A direct account is a path of one node and that
card _is_ the field; multisig and proxy get the standard multi-hop picker from the same click. `SigningPathSection` was
the obvious component and the wrong one — it hides itself below two nodes, which is exactly the case this field has to
render — so the field uses `SigningPathInline` with `editableInitiator`, until now a supported-but-unused prop.

Two model consequences: an account is always seeded (the selected wallet's, when the chain can hold one), because the
path is computed _from_ an initiator and with none there is nothing to click; and `$initiator` follows the path's source
node, so editing the card moves the account being staked from. No loop — the path model marks a hand-picked path as a
user override and stops recomputing defaults for it.

### Active nominations → nomination spread

The card counted validators _actively backing_ a position, which answers "is my stake working" but not "how spread am
I". It now reports the validators the selection nominates, with the active count moved to the subline — nothing lost.

Its drill-down is a new table: one row per nominated validator, ordered by how many of the selected accounts stand
behind it, with the era-backing count kept in its own column. Nominating and being backed are different facts. The donut
breakdown stays with APY, and `BreakdownMode` collapsed to `'apy'`, taking its now-dead branches and `mode` prop with
it.

### Rewards CSV → the indexer's own rows

`accountRewards` exposes more than the chart consumed. Probed the endpoint directly (introspection is disabled, but
GraphQL names unknown fields in its validation error): `id`, `address`, `amount`, `timestamp`, `blockNumber`, `type`
exist; `era`, `eventIdx` and `extrinsicHash` do not.

`MonthlyRewardRecord` and the query now carry all six, and the Rewards export writes one line per payout instead of the
claim table. Only per-payout rows with a block can be reconciled against the chain; a sum cannot. Fetched when the modal
opens — a year of history, shared with the chart's cache entry — so nobody pays for it until they ask. `claimCsvColumns`
lost its last caller and went with its tests.

### Total staked CSV → where the stake actually sits

One line per account → validator pair with the amount the era put behind it, read from the exposure pages the positions
aggregate already subscribes to, plus the account's bonded total. The split is the election's, not the nomination
list's: an account nominating sixteen validators is usually backing far fewer. A validator whose exposure page has not
been read is omitted rather than written down as a zero — a spreadsheet cannot tell an unread page from an empty
allocation once the zero is in it.

### Verification

`pnpm types:go` clean · eslint 0 errors · `check:feature-map` OK · both specs updated. **Not yet exercised in the
running app** — the session's Electron came back without a debug port.

## Nomination spread → allocation per nominator (2026-07-31)

The per-validator count table answered "who am I spread across" but not "did any of it work". Reworked it into the
allocation view: one row per **(account, validator)** pair, every nomination of every selected account, labelled with
what the era did with it.

### Three states, and the one that was missing

`active` / `droppedOut` (elected, our stake did not make a rewarded page) / `waiting` (not elected). The middle one is
the whole point — a nomination that reads fine in any list and earns nothing. The rule already existed in
`dashboard-staking-positions`; it is chain semantics, not feature UI, so it moved to
`positionsService.resolveNominationStatus` and both features now share it. Without the era validator set nothing is
called dropped out: an accusation the data does not support is worse than no answer.

An **active** validator whose exposure page has not been read carries `allocated: null` — an em dash on screen, an empty
cell in the export, never a zero. A `droppedOut` / `waiting` row carries `'0'`, which is a fact.

### The donut

Sized by the **fiat value of the stake behind each validator**, plus a grey slice for bonded stake backing nobody
(`stake.active` minus what the era allocated). Fiat, not planck: a chart mixing DOT and KSM by raw amounts ranks them by
decimals. It deliberately ignores the table's status filter — it is the whole picture the filtered list is a slice of.

### Consolidation

`lib/allocation.ts` + `useStakeAllocation` folded into `lib/spread.ts` + `useNominationSpread`; the Total-staked export
is now `toAllocationRows(spread)` — the two exports can no longer disagree about what the era paid. New export
`spreadCsvColumns` adds the status column beside the amount.

### Verification

`pnpm types:go` clean · eslint 0 errors · `check:feature-map` OK · KPI + positions + staking-domain suites green (310) ·
full unit suite green · both specs updated. **Not exercised in the running app** — Electron is still up without a debug
port.

## KPI row → four movable widgets (2026-07-31)

The four cards were one `colSpan={4}` widget, so edit mode gave the whole strip a single drag handle. Split into four DI
features (`dashboard/staking-total-staked`, `-apy`, `-nominations`, `-rewards`), each injecting its own `colSpan={1}`
widget into `dashboardStakingSlot` — DI keys a slot registration as `feature: ${name}` and the dashboard persists its
layout by that key, so a card can only move on its own if it is its own feature.

One module, four features: they share `useStakingKpi`, so every card assembles the same figures from the same stores.
Four calls instead of one is extra memo work, not extra traffic — the three reads the row drives (network APY, reward
window, unclaimed scan) all go through `useResourcePool`, which is ref-counted, and everything else is a store read.

**Saved layouts migrate.** `dashboardModel` expands the legacy key in place (`WIDGET_SPLITS`); without it the grid would
drop the unknown key and append the four cards at the bottom of an arranged tab.

**No-selection changed shape.** A quarter-width card has no room for the two-line "select accounts above" block, so each
card now keeps its shape, shows a grey em dash over "No accounts selected" and stops being clickable — `KpiCard.onClick`
became optional, and without it the card is not a button.

### Verification

`pnpm types:go` clean · eslint 0 errors · KPI + pages suites green (106) · `check:feature-map` OK · spec updated. **Not
exercised in the running app** — Electron is up without a debug port.

## Rewards drill-down → per validator (2026-07-31)

### What was actually broken

The donut was not missing, it was **empty**: slices came from unclaimed, and the wallet had `0 DOT` outstanding. Same
reason the screen looked read-only — nothing was claimable, so every checkbox was correctly disabled. The fix was not
rendering, it was what the screen is about.

### Validator, not nominator — confirmed against the runtime

`staking.payout_stakers_by_page(validator_stash, era, page)`: the unit is **(validator, era, page)**, the call is
permissionless, and it pays every nominator in the page at once. Consequence the old UI got wrong: two of our accounts
behind the same validator in the same era are **one** call, and the per-account rows would have submitted it twice — the
runtime rejects the second as `AlreadyClaimed`. Rows are now per (chain, validator), payouts deduped by (era, page),
amounts still summed per account, one signer per chain.

### Attribution: measured, not assumed

Probed the live indexer: `AccountReward` is `id / address / amount / timestamp / blockNumber / type` — **no validator**,
so received rewards cannot be attributed. Earned can: `eraValidatorInfos.others` carries our stake per (era, validator),
and the era formula (reward / points / commission) is the same one the runtime pays by. New domain module
`domains/staking/era-rewards` does exactly that.

Measured the cost: ~10 KB per (era, validator) row, so 84 eras × 10 validators ≈ 8 MB. Hence the era range is a
**parameter of the fetch**, one request per chain for the whole selection, not per stash.

### Deviation worth flagging

The period tabs bound the chart too, not only "received" + CSV as agreed — otherwise "all time" is that 8 MB fetch on
every open. Claim is never period-scoped: payouts expire by era, and a date filter would hide claimable money.

### Verification

`pnpm types:go` clean · eslint 0 errors · full suite 2686 green (89 in the feature) · `check:feature-map` OK · spec
updated. `lib/selection.ts` and its tests went with the checkbox flow. **Not exercised in the running app.**

## Rewards drill-down: filters, nominator rail, hover-scroll (2026-07-31)

- **Untranslated `rewards.outstanding`** — my bug: the key is pluralised (`_one`/`_other`) and i18next resolves the
  plural from `count`, but the call passed `validators`. With no plural resolved the key rendered raw. Renamed the
  interpolation to `{count}`.
- **Network filter** built from the rows, not from a list of chains — and only rendered when the selection stakes on
  more than one, because a filter with a single option is furniture.
- **Nominator filter is the rail under the donut.** One list answers "which of my accounts is behind this" and "show me
  only that one". Built from the network-scoped data but not the nominator-scoped data, so it never hides its own
  alternatives; clicking the active entry clears it.
- **Both filters reach the export.** `csvFileName` now takes parts and slugs them into the name —
  `nova-spektr-staking-reward-payouts-polkadot-30d-2026-07-31.csv`.
- **Donut centre** carries the validator count; hovering a slice still swaps to that validator's figures.
- **Hover-scroll**: pointing at a slice scrolls its row into view. `Table` renders the rows, so the anchor is a
  `data-row` attribute on the validator cell and the effect queries the scroll container. The hover state carries its
  source (`donut` | `row`) — scrolling on a row hover would fight the user's own scrolling.

### Verification

`pnpm types:go` clean · eslint 0 errors · full suite 2688 green (91 in the feature) · `check:feature-map` OK · spec
updated. **Not exercised in the running app.**

## Rewards drill-down: the crash, and an efficiency pass (2026-07-31)

### The crash

`Maximum update depth exceeded` inside Recharts' `JavascriptAnimate`, thrown from `commitHookEffectListUnmount`. The
ring is hover-driven, so every pointer move re-renders it; with animation on, Recharts mounts and unmounts the animation
component on each of those renders and the **unmount** sets state on the way out. Sweeping across the ring queued them
faster than React could flush. `isAnimationActive={false}` removes the component entirely — and an instant donut is the
right behaviour for a chart the user is pointing at anyway.

Same shape existed in `dashboard-portfolio-overview`'s allocation ring (hover + `animationDuration={400}`); fixed there
too rather than left as a known crash on another tab.

### Re-render

- **Hover moved to a context.** It was threaded through the columns memo, so every pointer move rebuilt the column
  definitions and re-rendered every row — each with a `NamedAccount`, i.e. name resolution per frame. Now only the
  colour dots subscribe; `Table` is memoised and skipped.
- **Donut handlers read data through a ref**, so `onMouseEnter` keeps its identity and Recharts stops rebuilding the
  sector tree.
- **Fiat resolved once per row** in `displayRows` instead of inside four memos and again in every cell.

### Data / caching

The filters were feeding the payout-history request key, so every network or nominator click refetched a year of history
and cached a separate copy per filter combination. The request is back to the whole selection per chain and the filters
apply in memory. Only the **period** may change a request — it changes which eras are attributed.

### Loading

Skeleton rows while the era attribution runs (it is a page walk plus a storage read per era, long enough to need a
shape), and a plain sentence once it has answered with nothing — shimmering there would tell a user with no rewards that
the app is still thinking.

### Verification

`pnpm types:go` clean · eslint 0 errors · full suite 2688 green · `check:feature-map` OK · specs updated. **The crash
itself is not reproduced in the app** — no debug port; the fix is reasoned from the stack trace.

## Rewards drill-down: driven in the running app (2026-07-31)

Electron relaunched with `--remote-debugging-port=9222` (the dev server survived; only the Electron processes were
restarted) and the widget driven over CDP.

### Confirmed fixed

- **The Recharts crash is gone.** 300 pointer moves across the ring: 0 React errors, 0 exceptions. Before the fix the
  same sweep produced the update-depth error.
- **Hover → scroll works.** Sector 7 lit row 9 and scrolled the list to 470px, sector 8 → row 5 → 352px, sector 9 → row
  0 → 58px. The lit row always matched the hovered sector.
- **Export name carries the filters**: `nova-spektr-staking-reward-payouts-kusama-asset-hub-30d-2026-07-31.csv`.
- **`rewards.outstanding` renders** — the plural key resolves now that it is passed `count`.

### Found and fixed while driving

- **Skeleton sizes were grid units, not pixels.** `Skeleton width={180}` means 180 × 4px in this kit; the ring became a
  720px ellipse and the row placeholders became fat pills. All of them now pass px strings, and the table's loading
  state reuses the real `Table` with the real column widths (`rewardColumnLayout.ts`), the way the positions table
  already did.
- **Two states were lying while loading.** `Earned` printed `0 DOT` before the era replay answered, and the footer said
  "Nothing outstanding" before the payout scan had looked. Both now shimmer per chain; `ClaimRow.unclaimedKnown` carries
  "asked yet" separately from "nothing".
- **The nominator rail was 74px for 114px of content** once a second account appeared. The left column scrolls as one
  region now, and the expiry warning moved to the footer, beside the button it warns about.

### Cold-start cost, measured

30 days, one account: **~7 s, ~131 KB**, 23 indexer responses. Far below the megabytes the payload sample suggested —
the indexer returns only rows the stash appears in.

### Two networks

Added a live Kusama nominator (`GhjDoG…RNbnnV`, 5931 KSM, era 8662) to the address book. Everything multi-chain holds:
`13.49M DOT + 21.44K KSM` never summed, the network filter appears (Polkadot AH / Kusama AH / All), filtering to Kusama
narrows 13 rows to 3 and the donut to $465.71, and the KSM position surfaces a real warning the DOT one never did — **20
unclaimed eras, oldest expires in 15d**.

---

# Fix: "Change validators" click froze the app for ~1-2s (2026-08-11)

## Diagnosis (measured in a real browser, not guessed)

- The click's effector part (`changeValidatorsRequested` → `formInitiated` cascade, `resolveAccountName` × 600) is
  **18ms** — not the problem.
- The freeze was **one ~1000ms long task** (~2s in Electron with devtools open): the synchronous React mount of
  `ValidatorTable`, which rendered **every** filtered validator row at once (221–600 rows, each with an identicon SVG,
  a Radix checkbox and tooltip wrappers) before the browser could paint the modal.
- The pending-skeleton path never softened the first open because the dashboard itself warms the validators cache (the
  drawer's nominations table loads the elected set).

## Done

- [x] ui-kit `Table`: opt-in `virtualization` prop (`@tanstack/react-virtual`, already a dependency; house pattern from
  `features/multisig-operations`). Spacer-`<tr>` technique keeps natural table flow; `table-layout: fixed` keeps
  columns aligned to the header.
- [x] `ValidatorTable`: `ScrollArea viewportRef` + `virtualization={{ rowHeight: 54 }}` — ~20-30 rows mounted instead
  of all of them.
- [x] `PositionDetailDrawer`: spinner on the pressed action chip; the dispatch is deferred by a double
  `requestAnimationFrame` so the spinner frame paints before the modal mounts.
- [x] RTL test: spinner appears on click, handoff fires after the deferred frames, spinner clears.

## Verified

- Browser (dev, warm cache): main-thread blockage on open **1063ms → 199ms**, longest task 140ms; 20 rows mounted,
  bottom spacer 10,908px. Scroll to middle/end, sort, search, "Show selected", detail pane all behave.
- `pnpm types:go` clean; 147 unit tests across both features pass.
