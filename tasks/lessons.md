# Lessons

## Resources belong in domains/, not features/

When creating `createQueryResource` resources, they must live in `domains/` (e.g.,
`domains/governance/track-locks/resource.ts`) with a corresponding `hooks.ts` wrapping `useResource`. Features consume
domain hooks via barrel imports — never create resources inside `features/`.

## Check for existing hooks before creating new resources

Before creating a new resource, search for existing hooks (e.g., `useBlock` already existed in `@/domains/network`).
Don't duplicate infrastructure that already exists in the codebase.

## Test fixtures must be genuinely unlike, not merely distinct

Fuzzy grouping rules break fixtures that were written to mean "these are all different". `Operator 1 … Operator 20`
(aggregate) and `Operator A … Operator E` (integration) were both intended as unrelated operators; once cluster grouping
learned to recognise an operator numbering its own nodes, both correctly collapsed to a single cluster and the tests
failed. The fixtures were wrong, not the code. When a fixture's _point_ is "unrelated", make the values unlike along the
dimension the code compares — and say so in a comment, or the next person restores the tidy-looking `Thing 1..N`.

## A stale module in the page invalidates runtime verification

Verifying a fix by reading Effector stores in the running renderer only works if the page is running the code you just
wrote. After editing `aggregates/staking-positions/model.ts`, the fix tested as _not applied_ — the EVM id was still in
the request — while the predicate it relies on returned the right answer when called directly. The page was holding a
copy of the model module loaded before the edit; `import('/@fs/...')` returns the app's live instance, which is exactly
why it also returns the _stale_ one. A full `location.reload()` and the same probe passed.

Rule: before concluding "the fix does not work" from live state, reload and re-probe. And when a probe contradicts a
unit test that passes, suspect the runtime's module identity before suspecting the logic.

## One bad key fails the whole batched storage read

`api.query.<pallet>.<entry>.multi(keys)` encodes every key up front, so a single unencodable key throws for the entire
batch — it does not return a per-key error or skip the offender. Mixing a 20 byte Ethereum-style `AccountId` into a
batch of 32 byte ids on an `AccountId32` chain rejected the whole ledger read, on every chain at once.

Two rules follow. Filter keys by what the chain can actually hold _before_ batching — for accounts that is
`accountService.isAccountSchemeMatchChain(accountId, chain)`, which works on a bare `AccountId` and needs no account
object. And never convert such a failure into an empty successful answer: `catch { return [] }` upstream turned a decode
error into "nobody is bonded", which is indistinguishable from a real answer and, in a chain-keyed cache shared with the
transaction forms, worse than a visible failure.

## `import()` in the page can hand you a _second_ copy of a module

Reading a running Effector model over CDP only proves something if you hold the instance the app is rendering. Importing
`/@fs/<abs path>/model/x.ts` looks like it reaches the app's module, and sometimes does — but after any HMR update Vite
serves the app's copy under a versioned URL (`…x.ts?t=<stamp>`), so the clean URL fetches a **fresh evaluation** with
its own stores. The duplicate answers every question plausibly and every answer is about nothing.

Symptom: the model reports a step the screen does not show. Check with identity, not values:

```js
const a = await import('…/index.tsx'); // the specifier the app itself imports
const b = await import('…/model/x.ts');
a.publicModel.$step === b.model.$step; // false → you are driving a copy
```

Rule: drive the instance reachable from the module the app loaded (usually the feature's `index`), and prefer clicking
the real UI for anything the UI is supposed to do. Related: [[a stale module in the page]] — same class of failure, one
is out of date, the other is a parallel universe.

## A modal footer can render outside the clipped card

`Modal.Content` wraps its children in a scroll area of its own. A step that brings its _own_ `ScrollArea` plus a
`Modal.Footer` therefore nests two scrollers: the inner one sizes to its content, the card grows past its bounded
height, and the centring container's `overflow-hidden` clips the bottom — footer included. The button is still in the
DOM, still reports a sensible `getBoundingClientRect()`, and `elementFromPoint` at its centre returns the overlay.

The tell is geometry, not appearance: `button.getBoundingClientRect().bottom` past the card's `bottom`, and a hit test
that lands on the overlay. Fix is structural — `<Modal.Content disableScroll>` when the step owns its scroll area, as
`ValidatorSelectionModal` does. Short forms hide the bug: the sibling flows nest the same way and fit, so copying their
shell is not evidence the layout works.
