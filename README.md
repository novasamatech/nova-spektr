//todo logo

<div align="center">

![badge](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/stepanLav/77132f25d05c7e9264cd410aef162a7e/raw/jest-coverage-main.json)
//generate with https://shields.io/
[![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/AcalaNetwork/Acala)](https://github.com/AcalaNetwork/Acala/tags) //todo
[![License](todo)](https://github.com/nova-wallet/omni-enterprise/blob/dev/LICENSE.md)
<br />
[![Twitter URL](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Ftwitter.com)](todo)
[![Telegram](https://img.shields.io/badge/Telegram-gray?logo=telegram)](todo)
[![Medium](https://img.shields.io/badge/Medium-gray?logo=medium)](todo)

</div>

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
Husky hooks will be installed automatically after installing project dependencies:

```json
"prepare": "husky install"
```
**P.S. don't update pre-commit file to `npm githook:pre-commit`**

## Starting development

Start application in the `dev` environment with hot-reload:

Electron:
```bash
pnpm start
```
Web:
```bash
pnpm start:renderer
```

## Project localisation

All the localisation files are stored in the `/src/shared/locale` folder.

ESlint checks if localisation files are well-formed and valid including:
1. Valid json formatting
2. Json files contain the same set of keys
3. Each key contains the same amount of placeholders for all locales
4. All `tsx` files are translated

### How to run localisation check
1. `pnpm lint:i18n-locale` checks if localization files are well-formed and valid
2. `pnpm lint:i18n-fix` fixes the keys sorting order
3. `pnpm lint:i18n-tsx` checks if `tsx` files are translated

### How to ignore localisation errors
In some cases there is no need to translate the text, so ESlint ignore rules should be used.
```tsx
<span className="font-bold">
  {/* eslint-disable-next-line i18next/no-literal-string */}
  {data?.asset.symbol} ({data?.asset.name})
</span>
```
or
```typescript
//eslint-disable-next-line i18next/no-literal-string
const qrCodePayload = `substrate:${address}:${wallet.publicKey}`;
```

## Packaging for production

To package application for the local platform:

```bash
pnpm build
pnpm postbuild
pnpm dist
```
