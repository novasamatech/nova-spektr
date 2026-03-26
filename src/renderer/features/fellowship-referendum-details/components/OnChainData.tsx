import { capitalize } from 'lodash';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, toAddress, truncate } from '@/shared/lib/utils';
import { FootnoteText, Icon, InfoLink, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Copy, Modal } from '@/shared/ui-kit';
import { JsonArgs } from '@/shared/ui-kit/JsonArgs/JsonArgs';
import {
  type EvidenceProposal,
  type OngoingReferendum,
  type Proposal,
  type RfcProposal,
  type SpendProposal,
  type UnknownProposal,
  type WhitelistProposal,
  referendumService,
  trackService,
  useTracks,
} from '@/domains/collectives';
import { useFellowshipApi, useFellowshipAsset, useFellowshipChain } from '@/aggregates/fellowship-network';
import { useConnectedReferendum } from '../hooks/useConnectedReferendum';

import { Card } from './Card';

type Props = {
  referendum: OngoingReferendum;
};

export const OnChainData = memo(({ referendum }: Props) => {
  const { t } = useI18n();
  const api = useFellowshipApi();
  const { data: tracks } = useTracks({ palletType: 'fellowship', api });
  const { data: connectedReferendum, pending: pendingConnected } = useConnectedReferendum(referendum.id);

  const track = tracks.find(tr => tr.id === referendum.track);
  const isWhitelist = referendum.proposal && referendumService.isWhitelistProposal(referendum.proposal);

  const referendumType = useMemo(() => {
    if (trackService.isPromotionTrack(referendum.track)) {
      return t('fellowship.voting.confirmation.promotionTrack');
    }
    if (trackService.isRetentionTrack(referendum.track)) {
      return t('fellowship.voting.confirmation.retentionTrack');
    }
    if (track) {
      return capitalize(track.name);
    }

    return null;
  }, [referendum.track, track, t]);

  return (
    <Card>
      <Box padding={6} gap={4}>
        <SmallTitleText>{t('fellowship.onChainData.title')}</SmallTitleText>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.origin')}</FootnoteText>
            <FootnoteText>{referendum.origin}</FootnoteText>
          </div>
          {referendumType && (
            <div className="flex items-center justify-between">
              <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.call')}</FootnoteText>
              <FootnoteText>{referendumType}</FootnoteText>
            </div>
          )}
          {referendum.proposal ? (
            <ProposalDetails proposal={referendum.proposal} />
          ) : (
            <FootnoteText className="mt-2 text-text-tertiary">
              {t('fellowship.onChainData.proposalNotAvailable')}
            </FootnoteText>
          )}

          {!pendingConnected && !connectedReferendum && isWhitelist && (
            <FootnoteText className="mt-2 text-text-tertiary">
              {t('fellowship.onChainData.governanceNotCreated')}
            </FootnoteText>
          )}
        </div>
      </Box>
    </Card>
  );
});

const ProposalDetails = ({ proposal }: { proposal: Proposal }) => {
  if (referendumService.isEvidenceProposal(proposal)) {
    return <EvidenceDetails proposal={proposal} />;
  }

  if (referendumService.isRfcProposal(proposal)) {
    return <RfcDetails proposal={proposal} />;
  }

  if (referendumService.isWhitelistProposal(proposal)) {
    return <WhitelistDetails proposal={proposal} />;
  }

  if (referendumService.isSpendProposal(proposal)) {
    return <SpendDetails proposal={proposal} />;
  }

  if (referendumService.isUnknownProposal(proposal)) {
    return <UnknownDetails proposal={proposal} />;
  }

  return null;
};

const EvidenceDetails = ({ proposal }: { proposal: EvidenceProposal }) => {
  const { t } = useI18n();
  const chain = useFellowshipChain();

  return (
    <>
      <div className="flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.member')}</FootnoteText>
        <div className="ml-auto max-w-[60%]">
          <Address
            address={toAddress(proposal.accountId, { prefix: chain?.addressPrefix })}
            variant="short"
            showIcon
            iconSize={16}
          />
        </div>
      </div>
      {proposal.rank != null && (
        <div className="flex items-center justify-between">
          <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.targetRank')}</FootnoteText>
          <FootnoteText>{`Rank ${proposal.rank}`}</FootnoteText>
        </div>
      )}
    </>
  );
};

const RfcDetails = ({ proposal }: { proposal: RfcProposal }) => {
  const { t } = useI18n();

  return (
    <>
      <div className="flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.pullRequest')}</FootnoteText>
        <InfoLink url={`https://github.com/polkadot-fellows/RFCs/pull/${proposal.pullRequest}`}>
          {`#${proposal.pullRequest}`}
        </InfoLink>
      </div>
      <div className="flex items-center gap-x-1">
        <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.documentHash')}</FootnoteText>
        <FootnoteText className="ml-auto text-text-tertiary">{truncate(proposal.documentHash, 7, 7)}</FootnoteText>
        <Copy value={proposal.documentHash} notification={t('fellowship.onChainData.documentHashCopied')}>
          <button type="button" className="shrink-0 cursor-pointer text-icon-default hover:text-icon-hover">
            <Icon name="copy" size={16} />
          </button>
        </Copy>
      </div>
    </>
  );
};

const InteractionStyle =
  'rounded-sm hover:bg-action-background-hover hover:text-text-primary cursor-pointer py-[3px] px-2 -mr-2';

const WhitelistDetails = ({ proposal }: { proposal: WhitelistProposal }) => {
  const { t } = useI18n();
  const chain = useFellowshipChain();

  const decodeUrl = chain?.nodes[0]
    ? `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(chain.nodes[0].url)}#/extrinsics/decode/${encodeURIComponent(proposal.proposalHex)}`
    : null;

  return (
    <>
      <div className="flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.callHash')}</FootnoteText>
        <Copy value={proposal.proposalHash} notification={t('fellowship.onChainData.callHashCopied')}>
          <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
            <FootnoteText className="text-inherit">{truncate(proposal.proposalHash, 7, 7)}</FootnoteText>
            <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
          </button>
        </Copy>
      </div>
      <div className="flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.callData')}</FootnoteText>
        <div className="flex items-center gap-1">
          <Copy value={proposal.proposalHex} notification={t('fellowship.onChainData.callDataCopied')}>
            <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
              <FootnoteText className="text-inherit">{truncate(proposal.proposalHex, 7, 8)}</FootnoteText>
              <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
            </button>
          </Copy>
          <Modal size="lg" height="fit">
            <Modal.Trigger>
              <button type="button" className={cnTw('group', InteractionStyle)}>
                <Icon name="details" size={16} className="group-hover:text-icon-hover" />
              </button>
            </Modal.Trigger>
            <Modal.Title close>{t('fellowship.onChainData.viewJson')}</Modal.Title>
            <Modal.Content>
              <Box padding={5}>
                <JsonArgs value={proposal.proposalJSON} />
              </Box>
            </Modal.Content>
          </Modal>
        </div>
      </div>
      {decodeUrl && (
        <div className="flex items-center justify-between">
          <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.details')}</FootnoteText>
          <InfoLink url={decodeUrl} withLinkIcon>
            {t('fellowship.onChainData.decode')}
          </InfoLink>
        </div>
      )}
    </>
  );
};

const SpendDetails = ({ proposal }: { proposal: SpendProposal }) => {
  const { t } = useI18n();
  const asset = useFellowshipAsset();

  const formattedAmount = asset
    ? `${formatBalance(proposal.amount, asset.precision).value} ${asset.symbol}`
    : proposal.amount.toString();

  return (
    <div className="flex items-center justify-between">
      <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.amount')}</FootnoteText>
      <FootnoteText>{formattedAmount}</FootnoteText>
    </div>
  );
};

const UnknownDetails = ({ proposal }: { proposal: UnknownProposal }) => {
  const { t } = useI18n();

  if (!proposal.description) return null;

  return (
    <div className="flex items-center justify-between">
      <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.description')}</FootnoteText>
      <FootnoteText className="max-w-[60%] truncate">{proposal.description}</FootnoteText>
    </div>
  );
};
