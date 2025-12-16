import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useCallback, useMemo } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';

import {
  type BlockHeight,
  type Chain,
  type Referendum as GovernanceReferendum,
  type ReferendumStatus,
  type TrackInfo,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, truncate } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { Button, FootnoteText, HeadlineText, IconButton, Separator, TitleText } from '@/shared/ui';
import { Box, Copy, Json, Label, Markdown, Modal, Skeleton } from '@/shared/ui-kit';
import { type Referendum, referendumService } from '@/domains/collectives';
import {
  useReferendumSummary,
  useReferendumTitles,
  useReferendums,
  useTracks,
  useUndecidingTimeout,
} from '@/domains/governance';
import { referendumService as governanceReferendumService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';
import { VotingStatusBadge } from '@/features/governance/components/VotingStatusBadge';
import { ReferendumEndTimer } from '@/widgets/ReferendumEndTimer';
import { useConnectedReferendum } from '../hooks/useConnectedReferendum';

import { Card } from './Card';

type Props = {
  fellowshipReferendum: Referendum;
};

export const ConnectedGovernanceReferendum = ({ fellowshipReferendum }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);

  const navigate = useNavigate();

  const { data: connectedReferendum } = useConnectedReferendum(fellowshipReferendum.id);

  const governanceApi = apis[connectedReferendum?.chainId];

  const { data: governanceReferendums } = useReferendums({ api: governanceApi });

  const connectedGovernanceReferendum = useMemo(
    () => governanceReferendums.find(x => x.referendumId === connectedReferendum?.referendumId),
    [governanceReferendums, connectedReferendum?.referendumId],
  );

  const { data: connectedGovernanceReferendumSummary } = useReferendumSummary({
    chainId: connectedReferendum?.chainId,
    referendumIds: [connectedReferendum?.referendumId],
  });

  const onViewClick = useCallback(() => {
    navigate(
      generatePath(Paths.GOVERNANCE_REFERENDUM, {
        chainId: connectedReferendum?.chainId,
        referendumId: connectedReferendum?.referendumId,
      }),
    );
  }, []);

  if (nullable(connectedReferendum) || nullable(connectedGovernanceReferendum)) {
    return null;
  }

  const chain = chains[connectedReferendum.chainId];
  const connectedGovernanceReferendumSummaryText =
    connectedGovernanceReferendumSummary?.[connectedReferendum?.referendumId].summary;
  const timelineApi = chain.additional?.timelineChain ? apis[chain.additional.timelineChain] : null;

  return (
    <Card>
      <Box padding={6}>
        <div className="mb-4 flex items-center gap-x-2">
          <TitleText>{t('fellowship.whitelist.summary')}</TitleText>
          <Label variant="purple">{t('fellowship.whitelist.aiGenerated')}</Label>
        </div>
        {connectedGovernanceReferendumSummaryText && <Markdown>{connectedGovernanceReferendumSummaryText}</Markdown>}

        <Separator className="mt-4 mb-2" />

        <GovernanceReferendumCard
          timelineApi={timelineApi!}
          chain={chain}
          governanceReferendum={connectedGovernanceReferendum}
          api={governanceApi}
          onViewClick={onViewClick}
        />

        <Separator className="my-4" />

        <Proposal referendum={fellowshipReferendum} />
      </Box>
    </Card>
  );
};

type GovernanceReferendumCardProps = {
  timelineApi: ApiPromise;
  chain: Chain;
  governanceReferendum: GovernanceReferendum;
  api: ApiPromise;
  onViewClick: (value: GovernanceReferendum) => void;
};

export const GovernanceReferendumCard = memo(
  ({ timelineApi, chain, governanceReferendum, api, onViewClick }: GovernanceReferendumCardProps) => {
    const { t } = useI18n();

    const { referendumId } = governanceReferendum;

    const provider = useUnit(governanceMetaProvider.$metaProvider);

    const { data: tracks } = useTracks({ api });
    const { data: undecidingTimeout } = useUndecidingTimeout({ api });

    const { data: titles, pending: isTitlesLoading } = useReferendumTitles({ chain, service: provider?.service });

    const title = titles[referendumId];

    const titleNode =
      title ||
      (isTitlesLoading ? (
        <Skeleton height="1em" width="28ch" />
      ) : (
        t('governance.referendums.referendumTitle', { index: referendumId })
      ));

    let track: TrackInfo | null = null;
    let endBlock: BlockHeight | null = null;
    let status: ReferendumStatus | null = null;
    if (governanceReferendumService.isOngoing(governanceReferendum)) {
      track = tracks[governanceReferendum.track];
      endBlock = governanceReferendumService.getReferendumEndTime(governanceReferendum, track, undecidingTimeout);
      status = governanceReferendumService.getReferendumStatus(governanceReferendum);
    }

    return (
      <div>
        <div className="flex w-full items-center gap-x-2">
          <VotingStatusBadge referendum={governanceReferendum} />

          {nonNullable(endBlock) && (
            <ReferendumEndTimer status={status} endBlock={endBlock} timelineApi={timelineApi} />
          )}
          <Button variant="text" className="ml-auto text-sm" onClick={() => onViewClick(governanceReferendum)}>
            {t('governance.referendums.viewReferendum')}
          </Button>
        </div>

        <div className="flex w-full items-start gap-x-6">
          <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
        </div>
      </div>
    );
  },
);

const Proposal = ({ referendum }: { referendum: Referendum }) => {
  const { t } = useI18n();

  if (
    !referendumService.isOngoing(referendum) ||
    !referendum.proposal ||
    !referendumService.isWhitelistProposal(referendum.proposal)
  ) {
    return null;
  }

  const { proposalHash, proposalJSON } = referendum.proposal;

  return (
    <div>
      <div className="flex items-center">
        <FootnoteText className="text-text-tertiary">{t('fellowship.whitelist.callHash')}</FootnoteText>
        <FootnoteText className="ml-auto text-text-tertiary">{truncate(proposalHash, 7, 7)}</FootnoteText>
        <Copy value={proposalHash} notification={t('fellowship.whitelist.callHashCopied')}>
          <IconButton className="shrink-0 self-center text-icon-default" name="copy" />
        </Copy>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('fellowship.whitelist.callData')}</FootnoteText>
        <Modal size="fit" height="lg">
          <Modal.Trigger>
            <Button className="p-0" size="sm" variant="text">
              {t('fellowship.whitelist.viewJson')}
            </Button>
          </Modal.Trigger>
          <Modal.Title close>{t('fellowship.whitelist.callData')}</Modal.Title>
          <Modal.Content>
            <Json value={proposalJSON} />
          </Modal.Content>
        </Modal>
      </div>
    </div>
  );
};
