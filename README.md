# Omni Enterprise

Polkadot & Kusama ecosystem Enterprise Desktop application.

## Key features

1. Add and manage wallets for Substrate networks.
2. Show wallet balances for multiple Substrate networks.
3. Token transfers in multiple Substrate networks.
4. MST account management.
5. MST creation and signing.
6. MST account and transactions interaction with Matrix standard.

## Development

### Requirements

Minimum version of `Node.js` is `v16.x`.

Minimum version of `pnpm` is `v7.x`.

## Install dependencies

To install all dependencies:

```bash
pnpm install
```
Setup husky to enable pre commit/push hooks:

```bash
pnpx husky-init
```
**P.S. don't update pre-commit file to `npm githook:pre-commit`**

## Starting development

Start the app in the `dev` environment with hot-reload:

```bash
pnpm start
```

## Project localisation

All the localisation files are stored in the `/src/shared/locale` folder.

ESlint checks if localisation files are well-formed and valid including:
1. Valid json formatting
2. Json files contain the same set of keys
3. Each key contains the same amount of placeholders for all locales
4. All `tsx` files are translated

### How to run localisation check
1. `pnpm lint:translation-files` checks if localization files are well-formed and valid
2. `pnpm lint:translation-pages` checks if `tsx` files are translated
3. `pnpm lint:translation-fix` fixes the keys sorting order

### How to ignore localisation errors
In some cases there is no need to translate the text. For example
```typescript
<span className="font-bold">
{data?.asset.symbol} ({data?.asset.name})
</span>{' '}
```
In that case the `{/* eslint-disable-next-line i18next/no-literal-string */}`
should be added
```typescript
<span className="font-bold">
{/* eslint-disable-next-line i18next/no-literal-string */}
{data?.asset.symbol} ({data?.asset.name})
</span>{' '}
```
or
```typescript
//eslint-disable-next-line i18next/no-literal-string
const qrCodePayload = `substrate:${address}:${wallet.publicKey}:Ff`;
```

## Packaging for production

To package app for the local platform:

```bash
pnpm build
pnpm postbuild
pnpm dist
```
