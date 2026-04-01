import { upperFirst } from 'lodash';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, truncate } from '@/shared/lib/utils';
import { FootnoteText, Icon, InfoLink, SmallTitleText } from '@/shared/ui';
import { Box, Copy, Modal } from '@/shared/ui-kit';
import { JsonArgs } from '@/shared/ui-kit/JsonArgs/JsonArgs';
import {
  type OngoingReferendum,
  type Proposal,
  type ProposalCallData,
  type RfcProposal,
  type SpendProposal,
  type UnknownProposal,
  type WhitelistProposal,
  referendumService,
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

  const trackName = useMemo(() => {
    if (track) {
      return upperFirst(track.name);
    }

    return null;
  }, [track]);

  return (
    <Card>
      <Box padding={6} gap={4}>
        <SmallTitleText>{t('fellowship.onChainData.title')}</SmallTitleText>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.referendumId')}</FootnoteText>
            <FootnoteText>{`#${referendum.id}`}</FootnoteText>
          </div>
          {trackName && (
            <div className="flex items-center justify-between">
              <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.call')}</FootnoteText>
              <FootnoteText>{trackName}</FootnoteText>
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
    return proposal.callData ? <CallDataDetails callData={proposal.callData} /> : null;
  }

  if (referendumService.isRfcProposal(proposal)) {
    return (
      <>
        <RfcDetails proposal={proposal} />
        {proposal.callData && <CallDataDetails callData={proposal.callData} />}
      </>
    );
  }

  if (referendumService.isWhitelistProposal(proposal)) {
    return <WhitelistDetails proposal={proposal} />;
  }

  if (referendumService.isSpendProposal(proposal)) {
    return (
      <>
        <SpendDetails proposal={proposal} />
        {proposal.callData && <CallDataDetails callData={proposal.callData} />}
      </>
    );
  }

  if (referendumService.isUnknownProposal(proposal)) {
    return (
      <>
        <UnknownDetails proposal={proposal} />
        {proposal.callData && <CallDataDetails callData={proposal.callData} />}
      </>
    );
  }

  return <ParseFailed />;
};

const ParseFailed = () => {
  const { t } = useI18n();

  return (
    <FootnoteText className="mt-2 text-text-tertiary">{t('fellowship.onChainData.proposalParseFailed')}</FootnoteText>
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
  if (!proposal.callData) return null;

  return <CallDataDetails callData={proposal.callData} />;
};

const CallDataDetails = ({ callData }: { callData: NonNullable<ProposalCallData['callData']> }) => {
  const { t } = useI18n();
  const chain = useFellowshipChain();

  const decodeUrl = chain?.nodes[0]
    ? `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(chain.nodes[0].url)}#/extrinsics/decode/${encodeURIComponent(callData.hex)}`
    : null;

  return (
    <>
      <div className="flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.callHash')}</FootnoteText>
        <Copy value={callData.hash} notification={t('fellowship.onChainData.callHashCopied')}>
          <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
            <FootnoteText className="text-inherit">{truncate(callData.hash, 7, 7)}</FootnoteText>
            <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
          </button>
        </Copy>
      </div>
      <div className="flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('fellowship.onChainData.callData')}</FootnoteText>
        <div className="flex items-center gap-1">
          <Copy value={callData.hex} notification={t('fellowship.onChainData.callDataCopied')}>
            <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
              <FootnoteText className="text-inherit">{truncate(callData.hex, 7, 8)}</FootnoteText>
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
                <JsonArgs value={callData.json} />
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
