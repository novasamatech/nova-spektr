import { type ApiPromise } from '@polkadot/api';
import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, HeadlineText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { ReferendumVoteChart, TrackInfo, referendumService, votingService } from '@/entities/governance';
import { listAggregate } from '../../aggregates/list';
import { proposerIdentityAggregate } from '../../aggregates/proposerIdentity';
import { listService } from '../../lib/listService';
import { type AggregatedReferendum } from '../../types/structs';
import { ReferendumEndTimer } from '../ReferendumEndTimer/ReferendumEndTimer';
import { VotedBy } from '../VotedBy';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';

type Props = {
  api: ApiPromise;
  asset: Asset;
  referendum: AggregatedReferendum;
  isTitlesLoading: boolean;
  onSelect: (value: AggregatedReferendum) => void;
};

export const ReferendumItem = memo(({ api, asset, referendum, isTitlesLoading, onSelect }: Props) => {
  const { t } = useI18n();

  const { referendumId, approvalThreshold } = referendum;

  const title = useStoreMap({
    store: listAggregate.$titles,
    keys: [referendum.referendumId],
    fn: (titles, [id]) => titles[id] ?? null,
  });

  const identity = useStoreMap({
    store: proposerIdentityAggregate.$proposers,
    keys: [referendum.votedByDelegates],
    fn: (proposers, [delegates]) => listService.getMappedIdentity(proposers, delegates),
  });

  const voteFractions =
    referendumService.isOngoing(referendum) && approvalThreshold
      ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;

  const titleNode =
    title ||
    (isTitlesLoading ? (
      <Skeleton height="1em" width="28ch" />
    ) : (
      t('governance.referendums.referendumTitle', { index: referendumId })
    ));

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex w-full items-center gap-x-2">
        <VotingStatusBadge referendum={referendum} />

        <ReferendumEndTimer status={referendum.status} endBlock={referendum.end} api={api} />

        <div className="text-text-secondary ml-auto flex">
          {referendumId && (
            <FootnoteText className="text-inherit" testId={TEST_IDS.GOVERNANCE.PROPOSAL_ID}>
              #{referendumId}
            </FootnoteText>
          )}
          {referendumService.isOngoing(referendum) && <TrackInfo trackId={referendum.track} />}
        </div>
      </div>

      <div className="flex w-full items-start gap-x-6">
        <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
        <div className="shrink-0 basis-[200px]">
          {voteFractions ? (
            <ReferendumVoteChart aye={voteFractions.aye} nay={voteFractions.nay} pass={voteFractions.pass} />
          ) : null}
        </div>
      </div>

      <Box width="max-content">
        <VotedBy
          direction="row"
          asset={asset}
          identity={identity}
          delegates={referendum.votedByDelegates}
          castingVotes={referendum.voting.votes}
        />
      </Box>
    </ListItem>
  );
});
