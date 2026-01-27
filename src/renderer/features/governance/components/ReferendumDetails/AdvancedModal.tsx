import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { type Asset, type OngoingReferendum } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { formatAsset, nonNullable } from '@/shared/lib/utils';
import { DetailRow, IconButton, Separator } from '@/shared/ui';
import { Hash } from '@/shared/ui-entities';
import { Copy, Modal } from '@/shared/ui-kit';
import { NamedAccount } from '@/widgets/NameResolver';
import { networkSelectorModel } from '../../model/networkSelector';
import { type AggregatedReferendum } from '../../types/structs';

import { ProposalDetails } from './ProposalDetails';

type Props = {
  referendum: AggregatedReferendum<OngoingReferendum>;
  asset: Asset;
  onClose: VoidFunction;
};

export const AdvancedModal = ({ asset, referendum, onClose }: Props) => {
  const { decisionDeposit, submissionDeposit, approvalThreshold, supportThreshold, tally, rawProposal } = referendum;

  const chain = useUnit(networkSelectorModel.$governanceChain);

  const { t } = useI18n();
  const [isOpen, closeModal] = useModalClose(true, onClose);

  const approvalCurve = approvalThreshold?.curve?.type;
  const supportCurve = supportThreshold?.curve?.type;

  const electorate = formatAsset(tally.ayes.add(tally.nays).add(tally.support), asset, { shorthands: { M: false } });
  const deposit = decisionDeposit ? formatAsset(decisionDeposit.amount, asset, { shorthands: { M: false } }) : null;

  const turnoutValue = supportThreshold ? BN.max(BN_ZERO, supportThreshold.value.sub(tally.support)) : BN_ZERO;
  const turnout = supportThreshold ? formatAsset(turnoutValue, asset, { shorthands: { M: false } }) : null;

  return (
    <Modal isOpen={isOpen} size="md" onToggle={closeModal}>
      <Modal.Title close>{t('governance.advanced.title')}</Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-4 ps-5 pe-3 pb-4">
          <DetailRow
            label={t('governance.advanced.fields.proposer')}
            className="text-right text-footnote text-text-secondary"
          >
            {submissionDeposit && chain ? (
              <NamedAccount accountId={submissionDeposit.who} chain={chain} variant="short" />
            ) : null}
          </DetailRow>

          <DetailRow label={t('governance.advanced.fields.deposit')}>{deposit}</DetailRow>

          {referendum.proposal ? <ProposalDetails proposal={referendum.proposal} /> : null}
          <Separator className="border-filter-border" />

          <div className="flex flex-col gap-2.5">
            <DetailRow label={t('governance.advanced.fields.approveCurve')}>
              {approvalCurve && t(`governance.curves.${approvalCurve}`)}
            </DetailRow>

            <DetailRow label={t('governance.advanced.fields.supportCurve')}>
              {supportCurve && t(`governance.curves.${supportCurve}`)}
            </DetailRow>

            <DetailRow label={t('governance.advanced.fields.turnout')}>{turnout}</DetailRow>

            <DetailRow label={t('governance.advanced.fields.electorate')}>{electorate}</DetailRow>

            {nonNullable(rawProposal) ? (
              <DetailRow label={t('governance.advanced.fields.callHash')}>
                <div className="flex w-32 items-center gap-1 text-footnote text-text-secondary">
                  <Hash value={rawProposal} variant="short" />
                  <Copy value={rawProposal}>
                    <IconButton name="copy" />
                  </Copy>
                </div>
              </DetailRow>
            ) : null}
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
};
