import { createStore } from 'effector';

import { type MultisigCandidate } from './types';

const $candidates = createStore<MultisigCandidate[]>([]);

export const multisigCandidatesAggregate = {
  $candidates,
};
