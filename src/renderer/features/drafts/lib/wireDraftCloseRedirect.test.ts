import { type Event, allSettled, createEvent, createStore, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { createDraftModel } from '../model/create-draft-model';

import { wireDraftCloseRedirect } from './wireDraftCloseRedirect';

// `.watch` is blocked by `effector/no-watch`; mirror events into a counter store.
const counterStore = <T>(event: Event<T>) => createStore(0).on(event, (n) => n + 1);

const $initiatedDraftWithRedirect = createStore(false);
const flowFinishedWithRedirect = createEvent();
const $redirectWithRedirect = createStore<string | null>(null);
const REDIRECT_DESTINATION = '/operations';
const $flowFinishedCount = counterStore(flowFinishedWithRedirect);

wireDraftCloseRedirect({
  $initiatedDraft: $initiatedDraftWithRedirect,
  flowFinished: flowFinishedWithRedirect,
  redirectTarget: $redirectWithRedirect,
  destination: REDIRECT_DESTINATION,
});

const $initiatedDraftBare = createStore(false);
const flowFinishedBare = createEvent();
const $flowFinishedBareCount = counterStore(flowFinishedBare);

wireDraftCloseRedirect({
  $initiatedDraft: $initiatedDraftBare,
  flowFinished: flowFinishedBare,
});

describe('wireDraftCloseRedirect · with redirect', () => {
  it('fires flowFinished and writes destination when $initiatedDraft is true', async () => {
    const scope = fork({ values: new Map().set($initiatedDraftWithRedirect, true) });

    await allSettled(createDraftModel.draftCreated, { scope });

    expect(scope.getState($flowFinishedCount)).toBe(1);
    expect(scope.getState($redirectWithRedirect)).toBe(REDIRECT_DESTINATION);
  });

  it('does nothing when $initiatedDraft is false (unrelated draft flow)', async () => {
    const scope = fork({ values: new Map().set($initiatedDraftWithRedirect, false) });

    await allSettled(createDraftModel.draftCreated, { scope });

    expect(scope.getState($flowFinishedCount)).toBe(0);
    expect(scope.getState($redirectWithRedirect)).toBe(null);
  });
});

describe('wireDraftCloseRedirect · no redirect', () => {
  it('fires flowFinished but does not touch a redirect target', async () => {
    const scope = fork({ values: new Map().set($initiatedDraftBare, true) });

    await allSettled(createDraftModel.draftCreated, { scope });

    expect(scope.getState($flowFinishedBareCount)).toBe(1);
  });

  it('skips flowFinished when not the initiating flow', async () => {
    const scope = fork({ values: new Map().set($initiatedDraftBare, false) });

    await allSettled(createDraftModel.draftCreated, { scope });

    expect(scope.getState($flowFinishedBareCount)).toBe(0);
  });
});
