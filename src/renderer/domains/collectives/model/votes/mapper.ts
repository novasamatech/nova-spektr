import { type ArrayElement } from '@/shared/core';
import { type collectivePallet } from '@/shared/pallet/collective';

import { type Vote } from './types';

export const mapVote = (
  vote: ArrayElement<Awaited<ReturnType<typeof collectivePallet.storage.voting>>>,
): Vote | undefined => {
  if (!vote.vote) return;

  return {
    accountId: vote.key.accountId,
    votes: vote.vote.data,
    decision: vote.vote.type,
  };
};
