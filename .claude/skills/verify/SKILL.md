---
name: verify
description: Runtime-verify a renderer change by driving the app in a browser — build/launch/drive recipe for Nova Spektr.
---

# Verifying renderer changes in a real browser

## Launch

- `pnpm start:renderer` serves the renderer at **https://localhost:3000** (Vite, ~30s until first page finishes bundling). The full Electron `pnpm start` is NOT needed for renderer-only changes — the app works in a plain browser.
- The mkcert-style dev cert covers `localhost` only — `https://127.0.0.1:3000` throws a cert interstitial. To get an **isolated storage origin** (fresh IndexedDB/localStorage without touching existing dev data), start a second instance: `pnpm start:renderer --port 3001` — same cert hostname, different origin.
- Dev data (wallets, operations) lives per-origin. `localhost:3000` and `:3001` may already contain the developer's real dev profiles — treat them as user data: read-only driving is fine, don't import DBs or clear storage, and revert any localStorage flag you flip.

## Getting a wallet

- Onboarding page (dev builds) has an **Import database** button accepting a Dexie export JSON; seeds live in `tests/system/data/db/` (e.g. `transfers/transfers_tests_db.json`). Only do this on a fresh origin.

## Driving gotchas

- Browser-extension `type` actions **drop characters** in the recipient Combobox — SS58 addresses arrive mangled and fail checksum validation. Set values via the native setter instead:
  `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input, addr); input.dispatchEvent(new Event('input',{bubbles:true}))`
- A valid stranger address for Polkadot-family chains: `13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq` (from the system-test fixtures). Don't type addresses from memory — checksum fails read as "Address has incorrect format".
- Hash-only `navigate` calls do NOT reload the page — persisted stores (`effector-storage` persist) only re-hydrate on a real `location.reload()`. Same-tab `localStorage.setItem` does not fire storage events either.
- Live model state is inspectable via Vite module URLs:
  `await import('/@fs/<abs-repo-path>/src/renderer/aggregates/<x>/model.ts')` then `.getState()` on stores. `knownCount`-style sanity values tell you whether you got the app's instance.
- Address-book connection state is driven by localStorage key `address-book-has-ever-connected` (`'true'`/absent) — flipping it + reload moves the app between never-connected and disconnected (unverifiable) modes without a backend. Fully-connected mode needs real backend auth; cover it with integration tests instead.
- The operations table needs a wide window; row action buttons (Approve/Reject) may sit off-viewport — use the extension's `find` for them rather than scrolling blindly.
