import { useGate, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';
import { generatePath, useParams } from 'react-router-dom';

import { nonNullable } from '@/shared/lib/utils';
import { referendaPallet } from '@/shared/pallet/referenda';
import { Paths } from '@/shared/routes';
import { referendumService } from '@/entities/governance';
import { ReferendumDetailsModal, networkSelectorModel } from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { RemoveVotesModal } from '@/widgets/RemoveVotesModal';
import { RevoteModal, VoteModal } from '@/widgets/VoteModal';
import { governancePageAggregate } from '../aggregates/governancePage';
import { DEFAULT_GOVERNANCE_CHAIN } from '../lib/constants';

export const GovernanceReferendumDetails = () => {
  useGate(governancePageAggregate.gates.flow);
  const { chainId, referendumId } = useParams<'chainId' | 'referendumId'>();

  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showRevoteModal, setShowRevoteModal] = useState(false);
  const [showRemoveVoteModal, setShowRemoveVoteModal] = useState(false);

  const network = useUnit(networkSelectorModel.$network);
  const all = useUnit(governancePageAggregate.$all);

  if (!referendumId) {
    return null;
  }

  const selectedReferendumId = referendaPallet.helpers.toReferendumId(parseInt(referendumId));

  const selectedReferendum = useMemo(() => {
    if (!selectedReferendumId) return null;

    return (
      all.find((x) => referendaPallet.helpers.toReferendumId(parseInt(x.referendumId)) === selectedReferendumId) ?? null
    );
  }, [all, selectedReferendumId]);

  useEffect(() => {
    if (nonNullable(selectedReferendum) && referendumService.isCompleted(selectedReferendum)) {
      setShowVoteModal(false);
      setShowRevoteModal(false);
      setShowRemoveVoteModal(false);
    }
  }, [selectedReferendum]);

  return (
    <>
      {nonNullable(selectedReferendum) && nonNullable(network) && (
        <ReferendumDetailsModal
          referendum={selectedReferendum}
          chain={network.chain}
          api={network.api}
          asset={network.asset}
          onClose={() => {
            setShowVoteModal(false);
            setShowRevoteModal(false);
            setShowRemoveVoteModal(false);
            navigationModel.events.navigateTo(
              generatePath(Paths.GOVERNANCE_LIST, { chainId: chainId || DEFAULT_GOVERNANCE_CHAIN }),
            );
          }}
          onVoteRequest={() => {
            setShowVoteModal(true);
            setShowRevoteModal(false);
            setShowRemoveVoteModal(false);
          }}
          onRemoveVoteRequest={() => {
            setShowRemoveVoteModal(true);
            setShowRevoteModal(false);
            setShowVoteModal(false);
          }}
          onRevoteRequest={() => {
            setShowRevoteModal(true);
            setShowRemoveVoteModal(false);
            setShowVoteModal(false);
          }}
        />
      )}

      {showVoteModal &&
        nonNullable(selectedReferendum) &&
        nonNullable(network) &&
        referendumService.isOngoing(selectedReferendum) && (
          <VoteModal
            referendum={selectedReferendum}
            chain={network.chain}
            asset={network.asset}
            onClose={() => setShowVoteModal(false)}
          />
        )}

      {showRevoteModal &&
        nonNullable(network) &&
        nonNullable(selectedReferendum) &&
        referendumService.isOngoing(selectedReferendum) && (
          <RevoteModal
            referendum={selectedReferendum}
            votes={selectedReferendum.voting.votes}
            chain={network.chain}
            asset={network.asset}
            onClose={() => setShowRevoteModal(false)}
          />
        )}

      {showRemoveVoteModal &&
        nonNullable(selectedReferendum) &&
        nonNullable(network) &&
        referendumService.isOngoing(selectedReferendum) && (
          <RemoveVotesModal
            single
            votes={selectedReferendum.voting.votes.map(({ voter, vote }) => ({
              vote,
              voter,
              referendum: selectedReferendum.referendumId,
              track: selectedReferendum.track,
            }))}
            chain={network.chain}
            asset={network.asset}
            api={network.api}
            onClose={() => setShowRemoveVoteModal(false)}
          />
        )}
    </>
  );
};
