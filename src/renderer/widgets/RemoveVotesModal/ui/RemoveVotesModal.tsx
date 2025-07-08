import { type ApiPromise } from '@polkadot/api';
import { useGate, useUnit } from 'effector-react';
import React, { Suspense, lazy } from 'react';

import { type AccountVote, type Asset, type Chain, type ReferendumId, type TrackId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { removeVotesModel } from '../default/model/removeVotesModal';

const RemoveVotesShardsModal = lazy(() =>
  import('../shards/components/RemoveVotesShardsModal').then(({ RemoveVotesShardsModal }) => ({
    default: RemoveVotesShardsModal,
  })),
);
const RemoveVotesDefaultModal = lazy(() =>
  import('../default/components/RemoveVotesDefault').then(({ RemoveVotesDefaultModal }) => ({
    default: RemoveVotesDefaultModal,
  })),
);

type Props = {
  /**
   * Adds account select in case of multiple votes with different accounts.
   */
  single?: boolean;
  votes: {
    voter: AccountId;
    referendum: ReferendumId;
    track: TrackId;
    vote?: AccountVote;
  }[];
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  onClose: VoidFunction;
};

export const RemoveVotesModal = ({ single, votes, chain, asset, api, onClose }: Props) => {
  useGate(removeVotesModel.gates.flow, {
    votes,
    chain,
    asset,
    api,
  });

  const votesList = useUnit(removeVotesModel.$votesList);

  return votesList.length > 1 && !single ? (
    <Suspense fallback={null}>
      <RemoveVotesShardsModal votes={votes} chain={chain} asset={asset} api={api} onClose={onClose} />
    </Suspense>
  ) : (
    <Suspense fallback={null}>
      <RemoveVotesDefaultModal single={single} chain={chain} asset={asset} onClose={onClose} />
    </Suspense>
  );
};
