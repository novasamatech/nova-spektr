import { type EventCallable, type Store, type StoreWritable, sample } from 'effector';

import { createDraftModel } from '../model/create-draft-model';

type Opts = {
  /** Per-flow marker exposed by `createDraftModeBinding`. */
  $initiatedDraft: Store<boolean>;
  /** Flow's own "wrap up everything" event. */
  flowFinished: EventCallable<void>;
  /**
   * Optional writable store that holds the post-submit redirect destination.
   * The helper writes `destination` into it when the originating flow's draft
   * is actually created. Omit both for flows that don't navigate after close.
   */
  redirectTarget?: StoreWritable<string | null>;
  /**
   * Where to send the user after a successful draft creation, e.g.
   * `Paths.OPERATIONS`.
   */
  destination?: string;
};

/**
 * Wires the "draft saved from this flow → close + redirect" plumbing. The
 * `$initiatedDraft` marker (from `createDraftModeBinding`) gates the effects so
 * unrelated draft flows triggered elsewhere don't close this one.
 */
export const wireDraftCloseRedirect = ({ $initiatedDraft, flowFinished, redirectTarget, destination }: Opts) => {
  if (redirectTarget && destination !== undefined) {
    sample({
      clock: createDraftModel.draftCreated,
      source: $initiatedDraft,
      filter: (initiated) => initiated,
      fn: () => destination,
      target: redirectTarget,
    });
  }
  sample({
    clock: createDraftModel.draftCreated,
    source: $initiatedDraft,
    filter: (initiated) => initiated,
    target: flowFinished,
  });
};
