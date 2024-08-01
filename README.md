<div align="center">
  <img src="src/renderer/shared/assets/images/misc/logo.svg" width="160" alt="Nova Spektr logo">
</div>

<div align="center">

![badge](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/stepanLav/77132f25d05c7e9264cd410aef162a7e/raw/jest-coverage-main.json)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/novasamatech/nova-spektr)](https://github.com/novasamatech/nova-spektr/releases)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/novasamatech/nova-spektr/blob/dev/LICENSE.md)
<br />
[![Twitter URL](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Ftwitter.com)](https://twitter.com/NovaSpektr)
[![Telegram](https://img.shields.io/badge/Telegram-gray?logo=telegram)](https://t.me/NovaSpektr)
[![Medium](https://img.shields.io/badge/Medium-gray?logo=medium)](https://medium.com/@NovaSpektr)
[![YouTube](https://img.shields.io/youtube/channel/views/UCrWNtfLVBu1GwZjVeyedwIg?style=social)](https://www.youtube.com/@NovaSpektr)

</div>

<!-- TOC -->
- [Introduction](#introduction)
- [What is Nova Spektr](#what-is-nova-spektr)
  - [Key features](#key-features)
  - [Changelog](#changelog)
- [Development](#development)
  - [Requirements](#requirements)
  - [Install dependencies](#install-dependencies)
  - [Start in production mode](#start-in-production-mode)
  - [Start in development mode](#start-in-development-mode)
  - [Project localisation](#project-localisation)
- [Production build](#production-build)
- [Contributing](#contributing)
- [Support](#support)
<!-- /TOC -->

# Introduction

## What is Nova Spektr

Polkadot & Kusama ecosystem Enterprise Desktop application.

## Key features

1. Hardware wallet (Polkadot Vault) support
2. Multishard wallet and multishard operations
3. Show wallet balances for any supported token (assets, ORML, balances)
4. Token transfer for any supported token (assets, ORML, balances)
5. Multisig account and transactions without passing callData off-chain
6. Relay Chain staking

## Changelog

Detailed changelog with releases description is located in the [changelog file](https://github.com/novasamatech/nova-spektr/blob/dev/CHANGELOG.md)

# Development

## Requirements

Minimum version of `Node.js` is `v18.x`.

Minimum version of `pnpm` is `v8.x`.

## Install dependencies

To install all dependencies:

```bash
pnpm install
```
Husky hooks will be installed automatically after installing project dependencies:

```bash
"prepare": "husky install"
```
**P.S. don't update pre-commit file to `npm githook:pre-commit`**

## Start in production mode
The `production` run configuration is the same as [production build](#production-build) except that the application won't be
installed in the operating system and source code hot-reload will be used.

Production configuration uses:
1. [`chains.json`](/src/renderer/shared/config/chains/chains.json) file for chains configuration
2. debug tools are disabled by default
3. errors are handled in a smooth way in order not to interrupt the user

Use the following instructions in order to start application in the `production` environment with hot-reload:

Electron (desktop) environment - recommended:
```bash
pnpm start
```
Web (browser) environment - not recommended:
```bash
pnpm start:renderer
```

## Start in development mode
The `dev` run configuration **shouldn't be** used for production. This configuration is only for developing new features and
debugging errors.

Development configuration uses:
1. [`chains_dev.json`](/src/renderer/shared/config/chains/chains_dev.json) file that contains testnets in order to debug and test new features
2. debug tools are enabled by default
3. error handling is turned off in order to pay developer's attention to errors

Use the following instructions in order to start application in the `dev` environment with hot-reload:

Electron (desktop) environment - recommended:
```bash
pnpm start:dev
```
Web (browser) environment - not recommended:
```bash
pnpm start:renderer:dev
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
Log files help to solve your problem. Logs are collected in the `nova-spektr.log` that is located in the folder:
1. macOS `~/Library/Logs/nova-spektr/nova-spektr.log` 
2. Windows `%USERPROFILE%\AppData\Roaming\nova-spektr\logs\nova-spektr.log`
3. Linux `~/.config/nova-spektr/logs/nova-spektr.log`

Sharing logs when you're contacting the support will speed up the problem-fixing process.

# Contributing
Contributing guide is described in the [CONTRIBUTING.md](https://github.com/novasamatech/nova-spektr/blob/dev/CONTRIBUTING.md)

# Support
Check the official support channels:
1. wiki (https://docs.novaspektr.io)
2. [Telegram group](https://t.me/NovaSpektr)
3. GitHub [issues](https://github.com/orgs/novasamatech/projects/4)

All issues are being tracked in the [Nova Spektr Support project](https://github.com/orgs/novasamatech/projects/4)

# Feedback
Your feedback is welcome. Use GitHub issues for submitting the feedback.
All feedback is being tracked in the [Nova Spektr Feedback project](https://github.com/orgs/novasamatech/projects/5)

## License
Nova Spektr - Polkadot, Kusama enterprise application is available under the Apache 2.0 license. See the LICENSE file for more info.
© Novasama Technologies GmbH 2023
