# Feature Map

> 🚧 **Documentation in progress.** Spec coverage is being added incrementally —
> most modules are not documented yet. Documented modules link to their spec
> README; plain names are modules still awaiting a spec.

**Documented: 2 / 119**

A curated index of every product module in [`src/renderer/features/`](./) and
[`src/renderer/aggregates/`](../aggregates/), grouped by product area. Aggregates
are marked with an `(aggregate)` suffix. Each module appears in exactly one home
section; related modules in other sections are referenced via "See also" notes.

## Wallets & Onboarding

- `account-selector`
- [`account-sync`](./account-sync/README.md)
- `accounts-structure`
- `wallets`
- `wallet-details`
- `wallet-fiat-balance`
- `wallet-pairing`
- `wallet-rename`
- `wallet-select`
- `hidden-wallets`
- `hide-unnamed-wallets`
- `extension-wallet`
- `ledger-wallet-pairing`
- `polkadot-vault-wallet`
- `polkadot-vault-wallet-pairing`
- `wallet-connect-wallet`
- `wallet-connect-wallet-pairing`
- `watch-only-wallet`
- `watch-only-wallet-pairing`
- `account-presets` (aggregate)
- `wallet-select` (aggregate)

> See also: [`multisig-wallet`](#multisig), [`proxied-wallet`](#proxy) — wallet
> types managed in their own product areas.

## Multisig

- `multisig-operations`
- `multisig-wallet`
- `multisig-wallet-create`
- `flexible-change-signatories`
- `flexible-operation-details`
- `multisig-candidates` (aggregate)
- [`multisig-operation-description`](../aggregates/multisig-operation-description/README.md) (aggregate)
- `selected-wallet-multisig-operations` (aggregate)

> See also: [`account-sync`](#wallets--onboarding) — discovers multisig wallets
> on-chain; [`call-data-execute`](#operations--signing) — executes pending
> multisig call data.

## Proxy

- `proxies`
- `proxy-add`
- `proxy-basket`
- `proxy-operation-details`
- `proxy-remove`
- `proxy-verify`
- `proxied-add-pure`
- `proxied-wallet`

> See also: [`account-sync`](#wallets--onboarding) — discovers proxied wallets
> on-chain.

## Staking

- `staking`
- `staking-navigation`
- `staking-basket`
- `staking-bond-extra`
- `staking-bond-nominate`
- `staking-nominate`
- `staking-operation-details`
- `staking-payee`
- `staking-restake`
- `staking-unstake`
- `staking-withdraw`
- `staking-accounts` (aggregate)
- `staking-network` (aggregate)

> See also: [`dashboard-staking`](#dashboard) — staking summary on the dashboard.

## Governance

- `governance`
- `governance-navigation`
- `governance-basket`
- `governance-operation-details`
- `governance-meta-provider` (aggregate)

> See also: [`dashboard-governance`](#dashboard) — governance summary on the
> dashboard.

## Fellowship

- `fellowship-activity-feed`
- `fellowship-basket`
- `fellowship-evidence`
- `fellowship-evidence-salary`
- `fellowship-members`
- `fellowship-navigation`
- `fellowship-overview`
- `fellowship-profile`
- `fellowship-promotion`
- `fellowship-referendum-details`
- `fellowship-retention`
- `fellowship-salary`
- `fellowship-tasks`
- `fellowship-voting`
- `fellowship-voting-history`
- `fellowship-member` (aggregate)
- `fellowship-network` (aggregate)
- `fellowship-promotion` (aggregate)
- `fellowship-retention` (aggregate)

## Transfers

- `transfer`
- `transfer-basket`
- `transfer-operation-details`
- `multi-transfer`
- `multi-transfer-operation-details`
- `vested-transfer`
- `vested-transfer-operation-details`
- `send-to-contact`

## Assets & Balances

- `assets`
- `assets-balances`
- `assets-navigation`
- `assets-transaction`
- `assethub-migration-modal`
- `currency`
- `currency-select` (aggregate)

> See also: [`dashboard-portfolio-overview`](#dashboard),
> [`dashboard-price-charts`](#dashboard) — portfolio and price views on the
> dashboard.

## Operations & Signing

- `operations`
- `operations-navigation`
- `operation-templates`
- `app-custom-operations`
- `call-data-execute`
- `extrinsic-builder`
- `drafts`
- `signing-path`
- `sign-wallet-connect`

## Basket

- `basket-navigation`
- `basket-operations`
- `basket-operations` (aggregate)

> See also: domain basket flows live with their domains —
> [`staking-basket`](#staking), [`transfer-basket`](#transfers),
> [`proxy-basket`](#proxy), [`governance-basket`](#governance),
> [`fellowship-basket`](#fellowship).

## Dashboard

- `dashboard-governance`
- `dashboard-navigation`
- `dashboard-operations-queue`
- `dashboard-portfolio-overview`
- `dashboard-price-charts`
- `dashboard-staking`

## Contacts & Notifications

- `contacts`
- `contacts-navigation`
- `notifications`
- `notifications-navigation`

## App Shell & Platform

- `app-shell`
- `navigation`
- `network`
- `settings-navigation`
- `dapp-browser`
- `import-db`
- `emptyList`
- `backend` (aggregate)

---

🚧 This index is under active development — not every feature has a spec yet.
To add a spec, follow the convention in
[`docs/content/docs/code/style/feature-specs.md`](../../../docs/content/docs/code/style/feature-specs.md);
Claude Code users: the `feature-specs` skill automates the workflow. Run
`node scripts/check-feature-index.mjs` to verify the map is in sync.
