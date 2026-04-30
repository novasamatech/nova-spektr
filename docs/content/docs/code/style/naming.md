---
title: Naming
sidebar:
  order: 0
---

## Variables

### Usual variable names

Variables should have full words in their names, without abbreviations.  
The exception is single-letter variables in predicate functions.
They should get first letter from entity name.

```ts
const walletId = 0;
const allAccounts = [/*...*/];

const walletAccounts = allAccounts.filter(a => a.walletId === walletId);
                                       /* ^ abbreviation for account */
```

### Larger the scope - simpler the name

For widely used or global entities, use concise, general names.  
For more localized or specific contexts, use more descriptive and precise names.

```ts
// General accounts model
import { accounts } from '@/domains/network';

// Function scope
function filterAccounts(allAccounts: AnyAccount[], chain: Chain) {
  const chainAccounts = allAccounts.filter(a => a.chainId === chain.id);
  return chainAccounts;
}
```

### Start function names with verb

```ts
function checkValue() {}
function mapValue() {}
function getValue() {}
function fetchValue() {}
function calculateValue() {}
```

## Effector

Effector naming convention inherits [official](https://effector.dev/en/guides/best-practices/#naming) recommendations.
Event and effect should be called with verb at start - same way as functions.

```ts
const fetchFx = createEffect();
const $store = createStore();
const fetchValue = createEvent();
```
