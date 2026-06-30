# Nova Spektr — Regression Test Plan

Regression test plan for **Nova Spektr**, the Polkadot & Kusama ecosystem enterprise
desktop wallet (Electron + React). It covers the full product surface, maps existing
automated coverage, and defines manual regression suites, environments, exit criteria,
and a smoke subset.

- **App under test:** Nova Spektr desktop (Electron) and its renderer (also runnable in a browser).
- **Source of truth for screens:** `src/renderer/shared/routes/paths.ts`, `src/renderer/pages/index.tsx`, sidebar in `src/renderer/features/app-shell/components/Navigation.tsx`.
- **Automated e2e suite:** Playwright under `tests/system/` (run with `pnpm test:system`).
- **Automated unit/integration:** Vitest under `src/**` and `tests/integrations/` (`pnpm test`, `pnpm test:integration`).

---

## 1. Objectives & scope

### Objectives
- Detect regressions in core wallet flows before each release.
- Keep automated coverage (Playwright `@regress`) authoritative for happy paths; cover the rest with structured manual passes.
- Provide a repeatable, prioritized checklist for release candidates.

### In scope
- All sidebar product areas: Dashboard, Assets/Transfers, Staking, Governance, Fellowship, Operations (multisig), Basket, Contacts, Notifications, Settings, dApp browser.
- All wallet types and pairing flows.
- Cross-cutting concerns: network connectivity, persistence/migrations, localization, error handling, security (CSP / store key whitelist), updates.

### Out of scope (unless explicitly requested)
- Load/perf benchmarking, penetration testing.
- Third-party chain/runtime correctness (we test integration, not the chains themselves).
- Mobile (Nova Spektr is desktop/web only).

---

## 2. Test environments & configuration

The build mode selects the chains file and debug behavior (see `README.md` → "Difference between environments").

| Environment | Chains file | Debug tools | Error handling | How to run |
|---|---|---|---|---|
| Development | `chains_dev.json` (testnets + relay) | on | off (errors surfaced) | `pnpm start` (Electron) / `pnpm start:renderer` (browser) |
| Staging | `chains.json` (prod) | on | smooth | `pnpm preview` |
| Production | `chains.json` (prod) | off | smooth | `pnpm build` + packaged app |

**Regression matrix decision:** run the full functional regression against **staging** (production chains, real referenda/validators) and a **smoke pass** against a packaged **production** build. Use **development** for flows that need testnets and faster iteration.

### Feature flags (override via `localStorage` key `spektr_features_v1`)
Verify default-on areas are visible and default-off areas are hidden. Notable flags: `dappBrowser` (off), `operationsQueueWidget` (off), `codex` (off), `importDB` (dev only), `appCustomOperations`/`callData`/`multiTransfer`/`vestedTransfer` (on). Source: `src/renderer/shared/config/features/index.ts`.

### Platforms
- macOS, Windows, Linux packaged builds (per release targets in `electron-builder.js`).
- Renderer-in-browser (Chrome) for fast functional checks.

---

## 3. Wallet-type matrix (primary test dimension)

Most flows must be validated per wallet type because signing, account structure, and available actions differ. Source: onboarding test ids in `src/renderer/shared/constants/testIds.ts`.

| Wallet type | Pairing entry | Can sign? | Notes |
|---|---|---|---|
| Polkadot Vault (incl. single/ multishard, dynamic derivations) | QR pairing | Yes (QR) | Substrate + Ethereum-based roots |
| Nova Wallet / WalletConnect | WC QR/deeplink | Yes (WC) | Remote signing |
| Watch-only | Address input | No | Read-only; sign/transfer actions hidden |
| Multisig (regular & flexible) | Created post-onboarding | Yes (via signatory) | Needs Matrix/backend for off-chain coordination |
| Proxied | Discovered on-chain via `account-sync` | Yes (via proxy) | Permission-scoped |
| Browser extensions (Polkadot.js, Talisman, SubWallet) | Extension connect | Yes | Desktop only |
| Ledger | Placeholder/disabled | — | Currently disabled card |

**Priority wallet types for every release:** Polkadot Vault, Watch-only, Multisig, Proxied, Nova/WalletConnect.

---

## 4. Coverage strategy: automated vs manual

### Existing automated e2e (`tests/system/`, `pnpm test:system`)
| Area | File | Tags |
|---|---|---|
| Watch-only onboarding | `cases/onboarding/watch.only.onboarding.system.test.ts` | `@regress` |
| Polkadot Vault onboarding | `cases/onboarding/vault.onboarding.system.test.ts` | `@regress` |
| Multisig onboarding (regular + flexible) | `cases/onboarding/multisig.onboarding.system.test.ts` | `@regress` |
| Regular transfers (Vault / Nova / Multisig / Proxy / Watch-only guards) | `cases/transfers/transfers.system.test.ts` | `@regular-transfers @regress` |
| XCM transfers | `cases/transfers/xcm.transfers.system.test.ts` | `@xcm-transfers @regress` |
| Transfer validations (permissions, deposits, fees, inactive account) | `cases/validations/validations.system.test.ts` | `@regress @validations` |
| Governance delegated/direct votes | `cases/governance/governance.system.test.ts` | `@governance` |
| Fee loading (substrate + ethereum chains) | `cases/assets/load.fee.test.ts`, `load.eth.fee.test.ts` | `@fee-test`, `@eth-test` |

Run the regression-tagged subset with `pnpm test:system:regress`. Fee-only with `pnpm test:system:load-fee`.

**Gaps not yet automated (→ manual suites below):** Dashboard, Staking flows, Governance vote/delegate/unlock *actions* (only vote display is automated), Fellowship, Operations queue (approve/reject/call-data), Basket, Contacts, Notifications, Settings (networks/currency/referendum/backend), dApp browser, WalletConnect/extension/Ledger pairing, DB import/export & migrations, localization.

### Test case conventions
- **ID:** `REG-<AREA>-<n>` (e.g. `REG-TRANSFER-03`).
- **Type:** `Auto` (with file reference) or `Manual`.
- **Priority:** P0 (smoke/blocker), P1 (core), P2 (secondary).

---

## 5. Functional regression suites

> Each suite lists representative cases. For `Auto` cases, the listed Playwright file is the executable spec; the manual steps are the fallback / exploratory script.

### 5.1 Onboarding & wallet pairing

| ID | Title | Pri | Type | Steps (summary) | Expected |
|---|---|---|---|---|---|
| REG-ONB-01 | Watch-only onboarding | P0 | Auto — `onboarding/watch.only…` | Add Watch-only, name + valid address, continue | Lands on Assets/dashboard; wallet listed under "Watch-only"; balances load |
| REG-ONB-02 | Polkadot Vault onboarding (no camera) | P1 | Auto — `onboarding/vault…` | Open Vault pairing without camera permission | Camera-denied state shown |
| REG-ONB-03 | Multisig (regular) creation | P0 | Auto — `onboarding/multisig…` | Create regular multisig from signatories | Multisig wallet created |
| REG-ONB-04 | Multisig (flexible) creation | P1 | Auto — `onboarding/multisig…` | Create flexible multisig | Flexible multisig created |
| REG-ONB-05 | WalletConnect / Nova pairing | P1 | Manual | Pair via WC QR/deeplink | Session established; accounts imported |
| REG-ONB-06 | Browser extension pairing (PJS/Talisman/SubWallet) | P2 | Manual | Connect extension, authorize | Accounts imported |
| REG-ONB-07 | Onboarding guard redirects | P1 | Manual | Visit `/onboarding` with a wallet present; visit `/` with none | Redirect to `/dashboard` / `/onboarding` respectively |
| REG-ONB-08 | Invalid watch-only address | P2 | Manual | Enter malformed SS58 | Inline validation error; continue disabled |

### 5.2 App shell & navigation

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-SHELL-01 | Sidebar items reflect feature flags | P1 | Manual | Default-on areas visible; `dappBrowser` hidden by default |
| REG-SHELL-02 | Wallet switcher | P0 | Manual | Switch wallet → all pages reflect selected wallet; search works |
| REG-SHELL-03 | Sidebar collapse/expand persists | P2 | Manual | State persists across reload |
| REG-SHELL-04 | Badges (operations/basket/notifications) | P1 | Manual | Counts update with pending items |
| REG-SHELL-05 | Custom operations dropdown | P2 | Manual | Call data / vested / multi-transfer entries appear when flags on |
| REG-SHELL-06 | First-load resilience | P1 | Manual | App recovers (refresh) from transient first-load error boundary in dev |

### 5.3 Dashboard

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-DASH-01 | Overview widgets render | P1 | Manual | Portfolio, price charts, staking summary populate for selected accounts |
| REG-DASH-02 | Tab switching (Overview/Staking/Governance) | P1 | Manual | Each tab loads its widgets |
| REG-DASH-03 | Edit mode reorder persists | P2 | Manual | Reordered widgets persist |
| REG-DASH-04 | Dashboard account preset switch | P2 | Manual | Widgets recompute for preset |
| REG-DASH-05 | Empty state | P2 | Manual | Watch-only / no-data accounts show empty states, no crash |

### 5.4 Assets & transfers

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-ASSET-01 | Token vs chain view & hide-zero | P1 | Manual | View toggles work; zero balances hidden when set |
| REG-ASSET-02 | Balances load across chains | P0 | Manual | Native/asset/ORML balances display; fiat shown |
| REG-ASSET-03 | Fee loads per chain (substrate) | P1 | Auto — `assets/load.fee` | Fee > 0 for each enabled chain |
| REG-ASSET-04 | Fee loads (ethereum-based) | P1 | Auto — `assets/load.eth.fee` | Fee > 0 for Moonbeam/Moonriver/Mythos |
| REG-TRANSFER-01 | Vault single-wallet transfer | P0 | Auto — `transfers/transfers…` | Transfer confirm → sign path reached |
| REG-TRANSFER-02 | Nova/WC transfer | P0 | Auto — `transfers/transfers…` | Confirm reached |
| REG-TRANSFER-03 | Multisig transfer | P0 | Auto — `transfers/transfers…` | Signatory chosen; confirm reached |
| REG-TRANSFER-04 | Proxy transfer | P1 | Auto — `transfers/transfers…` | Confirm reached |
| REG-TRANSFER-05 | XCM cross-chain transfer | P0 | Auto — `transfers/xcm…` | Origin/destination fees shown; confirm reached |
| REG-TRANSFER-06 | Watch-only cannot transfer | P0 | Auto — `transfers/transfers…` | Send buttons hidden; transfer modal blocked |
| REG-TRANSFER-07 | Receive flow (QR) | P1 | Manual | Address + QR shown for chain/asset |
| REG-TRANSFER-08 | Multi-transfer & vested transfer | P2 | Manual | Custom-ops flows build valid extrinsics |
| REG-TRANSFER-09 | Invalid transfer route params | P2 | Manual | `/assets/transfer` with bad `chainId/assetId` → redirect to `/assets` |

### 5.5 Transfer validations

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-VAL-01 | Proxy permission rights | P1 | Auto — `validations…` | Permission error shown; modal closes cleanly |
| REG-VAL-02 | Multisig signer missing account | P1 | Auto — `validations…` | Missing-account error |
| REG-VAL-03 | Available amount exceeded | P0 | Auto — `validations…` | Balance error |
| REG-VAL-04 | XCM fee validation | P1 | Auto — `validations…` | All fee rows validated |
| REG-VAL-05 | Inactive account | P1 | Auto — `validations…` | Inactive-account error |
| REG-VAL-06 | Multisig / proxy deposit | P1 | Auto — `validations…` | Deposit validations shown |

### 5.6 Staking (Asset Hub)

> Staking lives on Asset Hub (`DEFAULT_STAKING_CHAIN`). Validate per signable wallet type.

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-STAKE-01 | Network info & nominators list | P1 | Manual | Era, validators, per-account stakes/rewards render |
| REG-STAKE-02 | Bond & Nominate | P0 | Manual | Wizard builds extrinsic; confirm → sign |
| REG-STAKE-03 | Bond extra | P1 | Manual | Confirm → sign |
| REG-STAKE-04 | Unstake | P0 | Manual | Confirm → sign; unlocking shown |
| REG-STAKE-05 | Restake | P1 | Manual | Confirm → sign |
| REG-STAKE-06 | Withdraw | P1 | Manual | Withdrawable amount handled |
| REG-STAKE-07 | Change nominees | P1 | Manual | Validator set updated |
| REG-STAKE-08 | Set payee / reward destination | P1 | Manual | Payee updated |
| REG-STAKE-09 | Validators modal | P2 | Manual | Selected validators listed |
| REG-STAKE-10 | Network switch (Polkadot AH ↔ Kusama AH) | P1 | Manual | Data recomputes for chain |

### 5.7 Governance (OpenGov)

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-GOV-01 | Chain redirect & referendum list | P1 | Manual | `/governance` → chain list; ongoing + completed render |
| REG-GOV-02 | Delegated votes display | P1 | Auto — `governance…` | Mocked delegated vote details render on referendum |
| REG-GOV-03 | Referendum details modal | P1 | Manual | Details, timeline, votes shown |
| REG-GOV-04 | Vote (Aye/Nay/Abstain + conviction) | P0 | Manual | Vote extrinsic built; confirm → sign |
| REG-GOV-05 | Revote / Remove vote | P1 | Manual | Confirm → sign |
| REG-GOV-06 | Delegate / Edit / Revoke delegation | P1 | Manual | Delegation flows build valid extrinsics |
| REG-GOV-07 | Locks / Unlock schedule | P1 | Manual | Unlock flow shows claimable locks |
| REG-GOV-08 | Off-chain provider switch (Polkassembly/Subsquare) | P2 | Manual | Metadata source switch reloads descriptions |
| REG-GOV-09 | Search & filters (voted/not-voted) | P2 | Manual | Filtering works |

### 5.8 Fellowship

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-FEL-01 | Chain redirect & tasks render | P1 | Manual | `/fellowship` → collective chain; personal/active/completed tasks |
| REG-FEL-02 | Profile card & set-active | P1 | Manual | Profile + set-active confirm |
| REG-FEL-03 | Overview modal (members/ranks) | P2 | Manual | Members + ranks; codex tab if flag on |
| REG-FEL-04 | Voting tasks (promotion/retention/referendum) | P1 | Manual | Voting flows build extrinsics |
| REG-FEL-05 | Evidence & salary tasks | P2 | Manual | Evidence/salary flows |
| REG-FEL-06 | Fellowship basket signing | P2 | Manual | Batched sign |

### 5.9 Operations (multisig queue)

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-OPS-01 | Pending/History/Hidden tabs | P1 | Manual | Tabs filter operations |
| REG-OPS-02 | Approve operation | P0 | Manual | Approve → sign; status updates |
| REG-OPS-03 | Reject operation | P1 | Manual | Reject → sign |
| REG-OPS-04 | Provide call data (final signature) | P1 | Manual | Call data accepted; operation executes |
| REG-OPS-05 | Drafts section | P2 | Manual | Backend drafts listed/submittable |
| REG-OPS-06 | Deep-link error modals | P2 | Manual | Account-not-found / network-unavailable / already-signed handled |
| REG-OPS-07 | Flexible multisig: change signatories / controller | P1 | Manual | Edit flows work |

### 5.10 Basket

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-BSK-01 | Add operations to basket | P1 | Manual | Items queued; sidebar badge updates |
| REG-BSK-02 | Sign single basket tx | P0 | Manual | Sign modal → submit |
| REG-BSK-03 | Sign multiple basket txs | P1 | Manual | Batch sign → per-tx results |
| REG-BSK-04 | Basket visibility per wallet | P2 | Manual | Hidden when selected accounts don't support basket |

### 5.11 Contacts (address book)

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-CON-01 | Create / edit / delete contact | P1 | Manual | CRUD persists; edit via `?id=` route |
| REG-CON-02 | Local vs backend (Matrix) tabs | P2 | Manual | Tabs shown when backend configured |
| REG-CON-03 | Import contacts (+ conflicts) | P2 | Manual | Duplicates/conflicts resolved |
| REG-CON-04 | Send to contact | P1 | Manual | Launches transfer prefilled |

### 5.12 Notifications

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-NOT-01 | Notification inbox & badges | P1 | Manual | Items listed; unread count/dot correct |
| REG-NOT-02 | Filters (search/date) | P2 | Manual | Filtering works |
| REG-NOT-03 | Notification settings | P2 | Manual | Per-wallet mute / event types / sound persist |

### 5.13 Settings

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-SET-01 | Networks: enable/disable, RPC vs light client | P0 | Manual | Connection status updates; disable confirm works |
| REG-SET-02 | Add / edit custom RPC | P1 | Manual | Custom node saved and used |
| REG-SET-03 | Currency selection | P1 | Manual | Fiat values recompute app-wide |
| REG-SET-04 | Referendum off-chain provider | P2 | Manual | Provider switch persists |
| REG-SET-05 | Backend (Matrix) configuration | P1 | Manual | Connect/disconnect; status reflects |
| REG-SET-06 | Hidden wallets restore | P2 | Manual | Hide/restore works |
| REG-SET-07 | Auto-update toggle (Electron) | P2 | Manual | Toggle persists |
| REG-SET-08 | Import/Export database | P1 | Manual | Export then re-import restores wallets/contacts |

### 5.14 dApp browser (flag `dappBrowser` on)

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-DAPP-01 | Launch registered dApp | P2 | Manual | iframe host loads dApp |
| REG-DAPP-02 | Sign custom payload from dApp | P2 | Manual | Sign request modal → sign |

---

## 6. Cross-cutting & non-functional suites

| ID | Title | Pri | Type | Expected |
|---|---|---|---|---|
| REG-NET-01 | Network connection lifecycle | P0 | Manual | Networks reach "Connected"; reconnect after drop |
| REG-NET-02 | Light client (smoldot) mode | P1 | Manual | Chains sync via light client |
| REG-PERSIST-01 | State persistence across restart | P0 | Manual | Wallets, contacts, settings, selected wallet persist (IndexedDB / `effector-storage`) |
| REG-PERSIST-02 | DB migrations | P0 | Auto + Manual | Migrations run on upgrade without data loss (`tests/integrations/migrations`, `src/**/migration-*.test.ts`) |
| REG-I18N-01 | Localization completeness | P1 | Auto + Manual | i18n lint passes (`pnpm i18n:check:strict`); no raw strings; locales render |
| REG-ERR-01 | Error handling per environment | P1 | Manual | Dev surfaces errors; staging/prod handle smoothly (no white screen) |
| REG-SEC-01 | Preload store-key whitelist | P1 | Auto — `src/main/__tests__/preload.test.ts` | Unlisted store keys blocked |
| REG-SEC-02 | CSP enforced in packaged build | P1 | Manual | CSP meta present in prod; no unsafe inline in production bundle |
| REG-UPD-01 | Auto-update (Electron) | P2 | Manual | Update check/apply works on packaged build |
| REG-A11Y-01 | Basic accessibility | P2 | Manual | Keyboard nav, focus, Storybook a11y addon checks |

---

## 7. Smoke subset (P0 — run on every build / RC)

Fast confidence pass (~happy paths, one priority wallet each):
1. REG-ONB-01 Watch-only onboarding (Auto).
2. REG-ONB-03 Multisig creation (Auto).
3. REG-SHELL-02 Wallet switch.
4. REG-ASSET-02 Balances load.
5. REG-TRANSFER-01 Vault transfer (Auto).
6. REG-TRANSFER-05 XCM transfer (Auto).
7. REG-TRANSFER-06 Watch-only cannot transfer (Auto).
8. REG-STAKE-02 Bond & Nominate.
9. REG-GOV-04 Vote on referendum.
10. REG-OPS-02 Approve multisig operation.
11. REG-SET-01 Networks connect.
12. REG-PERSIST-01 Restart persistence.

Automated smoke command: `pnpm test:system:regress` (covers onboarding, transfers, validations).

---

## 8. Execution workflow

### Pre-conditions
- Build/run target prepared (staging recommended): `pnpm install`, then `pnpm preview` (staging) or packaged build for prod smoke.
- For automated e2e: renderer running (`pnpm start:renderer`) + `pnpm exec playwright install`; run `pnpm test:system` (see `tests/system/README.md`).
- Test wallets/fixtures available (see `tests/system/data/db/` for seeded DBs by wallet type).

### Per-cycle steps
1. Run automated regression: `pnpm test:system:regress` (+ `governance`, `load-fee` as needed).
2. Triage automated failures; separate **product regressions** from **environment flakiness** (live RPC/indexer latency — see `tests/system/README.md` and AGENTS.md).
3. Execute manual suites by priority (P0 → P1 → P2) across the priority wallet matrix.
4. Log defects with: env, build mode, wallet type, chain, repro steps, expected/actual, screenshots/`nova-spektr.log`.
5. Re-test fixes; update this plan if flows changed.

### Entry criteria
- RC build installs/launches; `pnpm lint`, `pnpm types:go`, `pnpm test` green.

### Exit criteria
- All P0 cases pass on staging; P0 smoke passes on a packaged production build.
- No open P0/P1 regressions; P2 issues triaged with owners.
- Automated `@regress` suite green (excluding known environment-flaky cases, which must be annotated).

---

## 9. Risk areas & known flakiness

- **Live-network dependence:** transfer/governance/fee suites depend on public RPC/indexer latency; treat connection timeouts as environment issues, not product regressions. Retries/timeouts are tuned in `playwright.config.ts` and the worker fixture.
- **DI slot-injected components:** require full reload for HMR; verify after navigation, not just hot reload (see `CLAUDE.md`).
- **AssetHub migration & staking-on-AH:** verify staking/governance target Asset Hub, not relay chains.
- **First-load error boundary (dev):** a one-time refresh recovers; not a release blocker by itself.

---

## 10. Traceability

- Screens/routes: `src/renderer/shared/routes/paths.ts`, `src/renderer/pages/index.tsx`.
- Product modules: Feature Map `src/renderer/features/README.md`.
- Automated specs: `tests/system/cases/**` (tags: `@regress`, `@regular-transfers`, `@xcm-transfers`, `@validations`, `@governance`, `@fee-test`, `@eth-test`).
- Integration/migration: `tests/integrations/`, `src/**/migration-*.test.ts`.
- Commands reference: `docs/content/docs/onboarding/getting-started.mdx`, root `package.json` scripts.
