# Feature Map

> 🚧 **Documentation in progress.** Spec coverage is being added incrementally — most modules are not documented yet.
> Documented modules link to their spec README; plain names are modules still awaiting a spec; trivial modules are
> marked `(no spec planned)`. Run `node scripts/check-feature-index.mjs` for current coverage numbers.

A curated index of every product module in [`src/renderer/features/`](./) and
[`src/renderer/aggregates/`](../aggregates/), grouped by product area. Aggregates are marked with an `(aggregate)`
suffix. Each module appears in exactly one home section; related modules in other sections are referenced via "See also"
notes.

## Wallets & Onboarding

- `account-selector`
- [`account-sync`](./account-sync/README.md)
- `accounts-structure`
- [`wallets`](./wallets/README.md)
- `wallet-details`
- `wallet-fiat-balance`
- `wallet-pairing`
- `wallet-rename`
- `wallet-select`
- `hidden-wallets`
- `hide-unnamed-wallets`
- `extension-wallet`
- `ledger-wallet-pairing`
- [`polkadot-vault-wallet`](./polkadot-vault-wallet/README.md)
- [`polkadot-vault-wallet-pairing`](./polkadot-vault-wallet-pairing/README.md)
- `wallet-connect-wallet`
- `wallet-connect-wallet-pairing`
- `watch-only-wallet`
- `watch-only-wallet-pairing`
- `account-presets` (aggregate)
- `wallet-select` (aggregate)

> See also: [`multisig-wallet`](#multisig), [`proxied-wallet`](#proxy) — wallet types managed in their own product
> areas.

## Multisig

- [`multisig-operations`](./multisig-operations/README.md)
- `multisig-wallet`
- `multisig-wallet-create`
- `flexible-change-signatories`
- [`flexible-operation-details`](./flexible-operation-details/README.md)
- `multisig-candidates` (aggregate)
- [`multisig-operation-description`](../aggregates/multisig-operation-description/README.md) (aggregate)
- `selected-wallet-multisig-operations` (aggregate)

> See also: [`account-sync`](#wallets--onboarding) — discovers multisig wallets on-chain;
> [`call-data-execute`](#operations--signing) — executes pending multisig call data.

## Proxy

- `proxies`
- `proxy-add`
- `proxy-basket`
- [`proxy-operation-details`](./proxy-operation-details/README.md)
- `proxy-remove`
- [`proxy-verify`](./proxy-verify/README.md)
- [`proxied-add-pure`](./proxied-add-pure/README.md)
- `proxied-wallet`

> See also: [`account-sync`](#wallets--onboarding) — discovers proxied wallets on-chain.

## Staking

- `staking`
- `staking-navigation` (no spec planned)
- `staking-basket`
- `staking-bond-extra`
- `staking-bond-nominate`
- `staking-nominate`
- [`staking-operation-details`](./staking-operation-details/README.md)
- `staking-payee`
- `staking-restake`
- `staking-unstake`
- `staking-withdraw`
- `staking-accounts` (aggregate)
- `staking-network` (aggregate)

> See also: [`dashboard-staking`](#dashboard) — staking summary on the dashboard.

## Governance

- `governance`
- `governance-navigation` (no spec planned)
- `governance-basket`
- [`governance-operation-details`](./governance-operation-details/README.md)
- `governance-meta-provider` (aggregate)

> See also: [`dashboard-governance`](#dashboard) — governance summary on the dashboard.

## Fellowship

- `fellowship-activity-feed`
- `fellowship-basket`
- `fellowship-evidence`
- `fellowship-evidence-salary`
- `fellowship-members`
- `fellowship-navigation` (no spec planned)
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
- [`transfer-operation-details`](./transfer-operation-details/README.md)
- [`multi-transfer`](./multi-transfer/README.md)
- [`multi-transfer-operation-details`](./multi-transfer-operation-details/README.md)
- [`vested-transfer`](./vested-transfer/README.md)
- [`vested-transfer-operation-details`](./vested-transfer-operation-details/README.md)
- [`vesting-claim`](./vesting-claim/README.md)
- [`vesting-portfolio`](../aggregates/vesting-portfolio/README.md) (aggregate)
- `send-to-contact`

## Assets & Balances

- `assets`
- `assets-balances`
- `assets-navigation` (no spec planned)
- `assets-transaction`
- `assethub-migration-modal`
- `currency`
- `currency-select` (aggregate)

> See also: [`dashboard-portfolio-overview`](#dashboard), [`dashboard-price-charts`](#dashboard) — portfolio and price
> views on the dashboard.

## Operations & Signing

- `operations`
- `operations-navigation` (no spec planned)
- `operation-templates`
- `app-custom-operations`
- [`call-data-execute`](./call-data-execute/README.md)
- `extrinsic-builder`
- [`drafts`](./drafts/README.md)
- [`signing-path`](./signing-path/README.md)
- `sign-wallet-connect` (no spec planned)

## Basket

- `basket-navigation` (no spec planned)
- `basket-operations`
- `basket-operations` (aggregate)

> See also: domain basket flows live with their domains — [`staking-basket`](#staking), [`transfer-basket`](#transfers),
> [`proxy-basket`](#proxy), [`governance-basket`](#governance), [`fellowship-basket`](#fellowship).

## Dashboard

- `dashboard-governance`
- `dashboard-navigation` (no spec planned)
- `dashboard-operations-queue`
- [`dashboard-portfolio-overview`](./dashboard-portfolio-overview/README.md)
- `dashboard-price-charts`
- `dashboard-staking`

> See also: [`vesting-claim`](#transfers) and [`vesting-portfolio`](#transfers) — the vesting callout is injected into
> the Portfolio Overview card.

## Contacts & Notifications

- `contacts`
- `contacts-navigation` (no spec planned)
- `notifications`
- `notifications-navigation` (no spec planned)

> See also: [`send-to-contact`](#transfers) — the transfer flow launched from the contacts page.

## App Shell & Platform

- `app-shell`
- `navigation`
- `network`
- `settings-navigation` (no spec planned)
- `dapp-browser`
- `import-db`
- `emptyList` (no spec planned)
- [`backend`](../aggregates/backend/README.md) (aggregate)

---

To add a spec, follow the convention in
[`docs/content/docs/code/style/feature-specs.md`](../../../docs/content/docs/code/style/feature-specs.md); Claude Code
users: the `feature-specs` skill automates the workflow. Run `node scripts/check-feature-index.mjs` (or
`pnpm check:feature-map`) to verify the map is in sync — it also prints the current coverage numbers.
