---
title: Effector
sidebar:
  order: 1
---

## The less the `sample`, the better

Typically, effector entities are recommended to be linked through sample.
However overusing samples can create code that's hard to follow, reminiscent of the messy control flow associated with goto statements.
Instead, many values can be calculated as derived - through `map` and `combine`.

```ts
const $chain = createStore();
const $accounts = createStore();

const $chainAccounts = combine($accounts, $chain, (allAccounts, chain) => {
  return accountService.filterAccountsOnChain(allAccounts, chain);
});
```

## Use effects instead of events for public api.

Usually, events are recommended for a module's public API.
This approach works well for simple scenarios, but often causes problems when the user needs to wait for the logic to complete before subsequent steps.
Therefore, instead of this, you can use an effect as the public API.

```ts
const createWalletFx = createEffect();

export const wallet = {
  create: createWalletFx,
}

/* later, in another module */

sample({
  clock: wallet.create.done,
  target: nextStep,
})
```

## Use `attach` for better execution control

For example, you have an effect from an external module that needs to be called and awaited.
But this effect is also used in other places, which can cause undesirable side effects.
Instead, the effect can be wrapped in `attach`, and then used.
This allows you to eliminate unwanted behavior in other modules.

```ts
const createWalletFx = attach({ effect: wallet.create });

sample({
  clock: createPolkadotWallet,
  target: createWalletFx,
});

sample({
  clock: createWalletFx.done,
  target: finishFlow,
});
```
