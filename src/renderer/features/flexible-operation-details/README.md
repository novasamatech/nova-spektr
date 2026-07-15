# Flexible Operation Details

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-15

## Overview

Recognizes an **"Edit flexible multisig"** operation in the [Operations view](../multisig-operations/README.md) and
gives its row a proper title and icon instead of the raw `proxy: proxy` section/method fallback. A flexible multisig is
a multisig that operates a proxied account; changing who controls it is executed on-chain as a proxy swap, and without
this feature that operation would read as an anonymous proxy call.

## Who can use it / when it applies

Applies automatically to any operation row whose transaction has the exact shape
`proxy.proxy( utility.batchAll[ addProxy, removeProxy ] )` — a batch of exactly two calls, add first, remove second,
wrapped in a proxy call. This is the shape Spektr emits when the controller of a flexible multisig is replaced. Any
other shape (a lone add/remove proxy, a reversed pair, an unwrapped batch) is left to other operation-details features.

## What the operation row shows

- **Title** — "Edit flexible multisig", with the source chain name as the subtitle.
- **Icon** — the delegated-authorities (proxy) icon.
- **Value** — nothing; the operation carries no displayable amount.
- **Expanded Details panel** — this feature adds no rows of its own; the panel shows only the shared rows (depositor,
  date/time, description).

## Supported wrappers

The proxy wrapper is not unwrapped before matching — it is part of the matched shape itself. The `utility.batchAll` pair
inside is the only batch shape recognized.

## Related

- The Operations view carries two **bespoke cards** for proxy-shaped operations — _Edit controller_
  (`parseProxyEditOperation`) and _Verify proxy_ (`parseVerifyProxyOperation`) — which are evaluated first and replace
  the generic icon + title block entirely, including this feature's output. The same on-chain shape is therefore usually
  presented by the Edit controller card (which also injects its own Details rows); this feature is the fallback
  presentation when the bespoke detectors do not claim the operation.
- [`multisig-operations`](../multisig-operations/README.md) — hosts the row, the transformers, and the details slot this
  feature injects into.
