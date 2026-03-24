import { type ApiPromise } from '@polkadot/api';
import { useStoreMap } from 'effector-react';
import { memo } from 'react';
import { generatePath } from 'react-router-dom';

import { TEST_IDS } from '@/shared/constants';
import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { getAppUrl } from '@/shared/routes/utils';
import { FootnoteText, HeadlineText, IconButton } from '@/shared/ui';
import { Box, Copy, Skeleton } from '@/shared/ui-kit';
import { ReferendumVoteChart, TrackInfo, referendumService, votingService } from '@/entities/governance';
import { networkUtils } from '@/entities/network';
import { ReferendumEndTimer } from '@/widgets/ReferendumEndTimer';
import { listAggregate } from '../../aggregates/list';
import { proposerIdentityAggregate } from '../../aggregates/proposerIdentity';
import { listService } from '../../lib/listService';
import { type AggregatedReferendum } from '../../types/structs';
import { VotedBy } from '../VotedBy';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';

type Props = {
  timelineApi: ApiPromise;
  chain: Chain;
  asset: Asset;
  referendum: AggregatedReferendum;
  isTitlesLoading: boolean;
  isApprovalThresholdsLoading?: boolean;
  onSelect: (value: AggregatedReferendum) => void;
};

export const ReferendumItem = memo(
  ({ timelineApi, chain, asset, referendum, isTitlesLoading, isApprovalThresholdsLoading, onSelect }: Props) => {
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

    const referendumPath = generatePath(Paths.GOVERNANCE_REFERENDUM, {
      chainId: networkUtils.chainNameToUrl(chain.name),
      referendumId,
    });
    const referendumLink = getAppUrl(referendumPath);

    return (
      <ListItem onClick={() => onSelect(referendum)}>
        <div className="flex w-full items-center gap-x-2">
          <VotingStatusBadge referendum={referendum} />

          <ReferendumEndTimer
            status={referendum.status}
            endBlock={referendum.end}
            timelineApi={timelineApi}
            chain={chain}
          />

          <div className="ml-auto flex text-text-secondary">
            {referendumId && (
              <FootnoteText className="text-inherit" testId={TEST_IDS.GOVERNANCE.PROPOSAL_ID}>
                #{referendumId}
              </FootnoteText>
            )}
            {referendumService.isOngoing(referendum) && <TrackInfo trackId={referendum.track} />}
            <Copy value={referendumLink.href} notification={t('governance.referendums.linkCopied')}>
              <IconButton className="ml-2 shrink-0 p-0 text-icon-default" name="export" />
            </Copy>
          </div>
        </div>

        <div className="flex w-full items-start gap-x-6">
          <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
          <div className="shrink-0 basis-[200px]">
            {voteFractions && (
              <ReferendumVoteChart aye={voteFractions.aye} nay={voteFractions.nay} pass={voteFractions.pass} />
            )}
            {!voteFractions && referendumService.isOngoing(referendum) && isApprovalThresholdsLoading && (
              <Skeleton height={4} />
            )}
          </div>
        </div>

        <Box width="max-content">
          <VotedBy
            direction="row"
            chain={chain}
            asset={asset}
            identity={identity}
            delegates={referendum.votedByDelegates}
            castingVotes={referendum.voting.votes}
          />
        </Box>
      </ListItem>
    );
  },
);
