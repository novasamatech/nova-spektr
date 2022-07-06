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

## Starting development

Start the app in the `dev` environment with hot-reload:

```bash
pnpm start
```

## Packaging for production

To package app for the local platform:

```bash
yarn build
yarn postbuild
yarn dist
```
