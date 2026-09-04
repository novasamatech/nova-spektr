import { useUnit } from 'effector-react';
import { type ReactNode, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { generatePath, useParams } from 'react-router-dom';

import { type ChainId } from '@/shared/core';
import { referendaPallet } from '@/shared/pallet/referenda';
import { Paths } from '@/shared/routes';
import { referendumService } from '@/entities/governance';
import { type AggregatedReferendum, ReferendumDetailsModal, networkSelectorModel } from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { RemoveVotesModal } from '@/widgets/RemoveVotesModal';
import { RevoteModal, VoteModal } from '@/widgets/VoteModal';
import { governancePageAggregate } from '../aggregates/governancePage';
import { DEFAULT_GOVERNANCE_CHAIN } from '../lib/constants';

export const GovernanceReferendumDetails = memo(() => {
  const { chainId, referendumId } = useParams<'chainId' | 'referendumId'>();

  const currentReferendums = useUnit(governancePageAggregate.$currentReferendums);

  // Computed null-safe rather than behind an early return: every hook below has
  // to run on every render.
  const selectedReferendumId = referendumId ? referendaPallet.helpers.toReferendumId(parseInt(referendumId)) : null;

  const selectedReferendum = useMemo(() => {
    if (!selectedReferendumId) return null;

    return (
      currentReferendums.find(({ referendumId }) => {
        return referendaPallet.helpers.toReferendumId(parseInt(referendumId)) === selectedReferendumId;
      }) ?? null
    );
  }, [currentReferendums, selectedReferendumId]);

  if (!selectedReferendum) {
    return null;
  }

  return <GovernanceReferendumDetailsModal referendum={selectedReferendum} chainId={chainId as ChainId} />;
});

type Props = {
  referendum: AggregatedReferendum;
  chainId?: ChainId;
  /**
   * Shown after the title — a host outside the Governance page names the chain
   * here.
   */
  titleBadge?: ReactNode;
  /** Name the wallet the vote acts for; see `VotingStatus`. */
  showVotingAs?: boolean;
  onClose?: VoidFunction;
};

export const GovernanceReferendumDetailsModal = ({
  referendum,
  chainId,
  titleBadge,
  showVotingAs,
  onClose: onCloseProp,
}: Props) => {
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showRevoteModal, setShowRevoteModal] = useState(false);
  const [showRemoveVoteModal, setShowRemoveVoteModal] = useState(false);

  const network = useUnit(networkSelectorModel.$network);

  const votes = useMemo(() => {
    if (referendumService.isCompleted(referendum)) {
      return [];
    }
    return referendum.voting.votes.map(({ voter, vote }) => ({
      vote,
      voter,
      referendum: referendum.referendumId,
      track: referendum.track,
    }));
  }, [referendum.voting.votes, referendum.referendumId]);

  useEffect(() => {
    if (referendumService.isCompleted(referendum)) {
      setShowVoteModal(false);
      setShowRevoteModal(false);
      setShowRemoveVoteModal(false);
    }
  }, [referendum]);

  const onClose = useCallback(() => {
    setShowVoteModal(false);
    setShowRevoteModal(false);
    setShowRemoveVoteModal(false);

    if (onCloseProp) {
      onCloseProp();
    } else {
      navigationModel.events.navigateTo(
        generatePath(Paths.GOVERNANCE_LIST, { chainId: chainId || DEFAULT_GOVERNANCE_CHAIN }),
      );
    }
  }, [chainId, onCloseProp]);

  const onVoteRequest = useCallback(() => {
    setShowVoteModal(true);
    setShowRevoteModal(false);
    setShowRemoveVoteModal(false);
  }, []);

  const onRemoveVoteRequest = useCallback(() => {
    setShowRemoveVoteModal(true);
    setShowRevoteModal(false);
    setShowVoteModal(false);
  }, []);

  const onRevoteRequest = useCallback(() => {
    setShowRevoteModal(true);
    setShowRemoveVoteModal(false);
    setShowVoteModal(false);
  }, []);

  const closeVoteModal = useCallback(() => setShowVoteModal(false), []);
  const closeRevoteModal = useCallback(() => setShowRevoteModal(false), []);
  const closeRemoveVoteModal = useCallback(() => setShowRemoveVoteModal(false), []);

  if (!network) {
    return null;
  }

  return (
    <>
      <ReferendumDetailsModal
        referendum={referendum}
        chain={network.chain}
        timelineApi={network.timelineApi}
        asset={network.asset}
        titleBadge={titleBadge}
        showVotingAs={showVotingAs}
        onClose={onClose}
        onVoteRequest={onVoteRequest}
        onRemoveVoteRequest={onRemoveVoteRequest}
        onRevoteRequest={onRevoteRequest}
      />

      {showVoteModal && referendumService.isOngoing(referendum) && (
        <VoteModal
          referendum={referendum}
          chain={network.chain}
          asset={network.asset}
          onClose={closeVoteModal}
          onSuccess={closeVoteModal}
        />
      )}

      {showRevoteModal && referendumService.isOngoing(referendum) && (
        <RevoteModal
          referendum={referendum}
          chain={network.chain}
          asset={network.asset}
          onClose={closeRevoteModal}
          onVoteSuccess={closeRevoteModal}
        />
      )}

      {showRemoveVoteModal && referendumService.isOngoing(referendum) && (
        <RemoveVotesModal
          single
          votes={votes}
          chain={network.chain}
          asset={network.asset}
          api={network.api}
          onClose={closeRemoveVoteModal}
        />
      )}
    </>
  );
};
