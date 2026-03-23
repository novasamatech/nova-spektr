import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, truncate } from '@/shared/lib/utils';
import { Button, FootnoteText, IconButton, InfoLink, SmallTitleText } from '@/shared/ui';
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
  useTracks,
} from '@/domains/collectives';
import { useFellowshipApi, useFellowshipAsset, useFellowshipChain } from '@/aggregates/fellowship-network';
import { useConnectedReferendum } from '../hooks/useConnectedReferendum';

import { Card } from './Card';

type Props = {
  referendum: OngoingReferendum;
};

export const TechnicalDetails = memo(({ referendum }: Props) => {
  const { t } = useI18n();
  const api = useFellowshipApi();
  const { data: tracks } = useTracks({ palletType: 'fellowship', api });
  const { data: connectedReferendum, pending: pendingConnected } = useConnectedReferendum(referendum.id);

  const track = tracks.find(tr => tr.id === referendum.track);
  const isWhitelist = referendum.proposal && referendumService.isWhitelistProposal(referendum.proposal);

  return (
    <Card>
      <Box padding={6} gap={4}>
        <SmallTitleText>{t('fellowship.technicalDetails.title')}</SmallTitleText>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.referendumId')}</FootnoteText>
            <FootnoteText>#{referendum.id}</FootnoteText>
          </div>
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.track')}</FootnoteText>
            <FootnoteText>{track ? `${track.name} (#${referendum.track})` : `#${referendum.track}`}</FootnoteText>
          </div>
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.origin')}</FootnoteText>
            <FootnoteText>{referendum.origin}</FootnoteText>
          </div>
          {referendum.proposal && (
            <>
              <div className="flex items-center justify-between">
                <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.call')}</FootnoteText>
                <FootnoteText>{referendum.proposal.type}</FootnoteText>
              </div>
              <ProposalDetails proposal={referendum.proposal} />
            </>
          )}

          {!pendingConnected && !connectedReferendum && isWhitelist && (
            <FootnoteText className="mt-2 text-text-tertiary">
              {t('fellowship.technicalDetails.governanceNotCreated')}
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
        <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.member')}</FootnoteText>
        <div className="max-w-[60%]">
          <Address
            address={toAddress(proposal.accountId, { prefix: chain?.addressPrefix })}
            variant="truncate"
            showIcon
            iconSize={16}
          />
        </div>
      </div>
      {proposal.rank != null && (
        <div className="flex items-center justify-between">
          <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.targetRank')}</FootnoteText>
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
        <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.pullRequest')}</FootnoteText>
        <InfoLink url={`https://github.com/polkadot-fellows/RFCs/pull/${proposal.pullRequest}`}>
          {`#${proposal.pullRequest}`}
        </InfoLink>
      </div>
      <div className="flex items-center">
        <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.documentHash')}</FootnoteText>
        <FootnoteText className="ml-auto text-text-tertiary">{truncate(proposal.documentHash, 7, 7)}</FootnoteText>
        <Copy value={proposal.documentHash} notification={t('fellowship.technicalDetails.documentHashCopied')}>
          <IconButton className="shrink-0 self-center text-icon-default" name="copy" />
        </Copy>
      </div>
    </>
  );
};

const WhitelistDetails = ({ proposal }: { proposal: WhitelistProposal }) => {
  const { t } = useI18n();

  return (
    <>
      <div className="flex items-center">
        <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.callHash')}</FootnoteText>
        <FootnoteText className="ml-auto text-text-tertiary">{truncate(proposal.proposalHash, 7, 7)}</FootnoteText>
        <Copy value={proposal.proposalHash} notification={t('fellowship.technicalDetails.callHashCopied')}>
          <IconButton className="shrink-0 self-center text-icon-default" name="copy" />
        </Copy>
      </div>
      <div className="flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.callData')}</FootnoteText>
        <Modal size="fit" height="lg">
          <Modal.Trigger>
            <Button className="p-0" size="sm" variant="text">
              {t('fellowship.technicalDetails.viewJson')}
            </Button>
          </Modal.Trigger>
          <Modal.Title close>{t('fellowship.technicalDetails.callData')}</Modal.Title>
          <Modal.Content>
            <JsonArgs value={proposal.proposalJSON} />
          </Modal.Content>
        </Modal>
      </div>
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
      <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.amount')}</FootnoteText>
      <FootnoteText>{formattedAmount}</FootnoteText>
    </div>
  );
};

const UnknownDetails = ({ proposal }: { proposal: UnknownProposal }) => {
  const { t } = useI18n();

  if (!proposal.description) return null;

  return (
    <div className="flex items-center justify-between">
      <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.description')}</FootnoteText>
      <FootnoteText className="max-w-[60%] truncate">{proposal.description}</FootnoteText>
    </div>
  );
};
