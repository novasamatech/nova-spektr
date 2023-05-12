<p align="center">
  <img src="logo" width="460" alt="Nova Spektr logo"> //todo
</p>

<div align="center">

![badge](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/stepanLav/77132f25d05c7e9264cd410aef162a7e/raw/jest-coverage-main.json)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/nova-wallet/omni-enterprise)](https://github.com/nova-wallet/omni-enterprise/releases)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/nova-wallet/omni-enterprise/blob/dev/LICENSE.md)
<br />
[![Twitter URL](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Ftwitter.com)](todo)
[![Telegram](https://img.shields.io/badge/Telegram-gray?logo=telegram)](todo)
[![Medium](https://img.shields.io/badge/Medium-gray?logo=medium)](todo)
[![YouTube](https://img.shields.io/youtube/channel/views/UCiP-xl8q-W4b4HiZh8N11Ew)](https://www.youtube.com/watch?v=yx1mY299cCM&list=PLpZ2RdLApAYvjXl-Ja2_Dv9g62JtLignp)

</div>

<!-- TOC -->
- [Introduction](#introduction)
- [What is Nova Spektr](#what-is-nova-spektr)
  - [Key features](#key-features)
  - [Changelog](#changelog)
- [Development](#development)
  - [Requirements](#requirements)
  - [Install dependencies](#install-dependencies)
  - [Start development](#start-development)
  - [Project localisation](#project-localisation)
- [Production build](#production-build)
- [Contributing](#contributing)
- [Support](#support)
<!-- /TOC -->

# Introduction

# What is Nova Spektr

Polkadot & Kusama ecosystem Enterprise Desktop application.

## Key features

1. Hardware wallet (Polkadot Vault) support
2. Multishard wallet and multishard operations
3. Show wallet balances for any supported token (assets, ORML, balances)
4. Token transfer for any supported token (assets, ORML, balances)
5. Multisig account and transactions with Spektr Matrix Protocol implementation
6. Relay Chain staking

## Changelog

Detailed changelog with releases description is located in the [changelog file](https://github.com/nova-wallet/omni-enterprise/blob/dev/CHANGELOG.md)

# Development

## Requirements

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

## Start development mode
The `dev` run configuration is the same as [production build](#production-build) except that the application won't be
installed in the operating system and source code hot-reload will be used.

Development configuration uses:
1. [`chains.json`](/src/renderer/services/network/common/chains/chains.json) file for chains configuration
2. debug tools are disabled by default
3. error are handled in a smooth way in order not to interrupt the user

Use the following instructions in order to start application in the `dev` environment with hot-reload:

Electron (desktop) environment - recommended:
```bash
pnpm start
```
Web (browser) environment - not recommended:
```bash
pnpm start:renderer
```

## Start debug mode
The `debug` run configuration **shouldn't be** used for production. This configuration is only for developing new features and
debugging errors.

Debug configuration uses:
1. [`chains_dev.json`](/src/renderer/services/network/common/chains/chains_dev.json) file that contains testnets in order to debug and test new features
2. debug tools are enabled by default
3. error handling is turned off in order to pay developer's attention to errors

Use the following instructions in order to start application in the `dev` environment with hot-reload:

Electron (desktop) environment:
```bash
pnpm start:debug
```
Web (browser) environment:
```bash
pnpm start:renderer:debug
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
const qrCodePayload = `substrate:${address}:${wallet.accountId}`;
```

# Production build

To package application for the local platform:

```bash
pnpm build
pnpm postbuild
pnpm dist
```
## Troubleshooting
Logs are collected in the 
1. macOS `~/Librarly/Logs/Nova Spektr/nova-spektr.log` file 
2. Windows todo
3. Linux todo

# Contributing
Contributing guide is described in the [CONTRIBUTING.md](https://github.com/nova-wallet/omni-enterprise/blob/dev/CONTRIBUTING.md)

# Support
Check the official support channels:
1. wiki (todo)
2. telegram group (todo)

All issues are being tracked in the [Nova Spektr Support project](https://github.com/orgs/nova-wallet/projects/4)

# Feedback
Your feedback is welcome. Use GitHub issues for submitting the feedback.
All feedback is being tracked in the [Nova Spektr Feedback project](https://github.com/orgs/nova-wallet/projects/5)
