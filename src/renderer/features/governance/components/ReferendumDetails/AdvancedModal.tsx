import { BN, BN_ZERO } from '@polkadot/util';

import { type Asset, type OngoingReferendum } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { copyToClipboard, formatAsset } from '@/shared/lib/utils';
import { BaseModal, DetailRow, IconButton, Separator, Truncate } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { type AggregatedReferendum } from '../../types/structs';

type Props = {
  referendum: AggregatedReferendum<OngoingReferendum>;
  asset: Asset;
  onClose: VoidFunction;
};

export const AdvancedModal = ({ asset, referendum, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, closeModal] = useModalClose(true, onClose);

  const { decisionDeposit, submissionDeposit, approvalThreshold, supportThreshold, tally, proposal } = referendum;
  const approvalCurve = approvalThreshold?.curve?.type;
  const supportCurve = supportThreshold?.curve?.type;

  const electorate = formatAsset(tally.ayes.add(tally.nays).add(tally.support), asset);
  const deposit = decisionDeposit ? formatAsset(decisionDeposit.amount, asset) : null;

  const turnoutValue = supportThreshold ? BN.max(BN_ZERO, supportThreshold.value.sub(tally.support)) : BN_ZERO;
  const turnout = supportThreshold ? formatAsset(turnoutValue, asset) : null;

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      panelClass="w-modal"
      contentClass="flex flex-col gap-4 py-4 ps-5 pe-3 "
      title={t('governance.advanced.title')}
      onClose={closeModal}
    >
      <DetailRow label={t('governance.advanced.fields.proposer')} className="px-2 text-footnote text-text-secondary">
        {submissionDeposit && <Address address={submissionDeposit.who} variant="short" canCopy={false} showIcon />}
      </DetailRow>

      <DetailRow label={t('governance.advanced.fields.deposit')}>{deposit}</DetailRow>

      <Separator className="border-filter-border" />

      <div className="flex flex-col gap-2.5">
        <DetailRow label={t('governance.advanced.fields.approveCurve')}>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          {approvalCurve && t(`governance.curves.${approvalCurve}`)}
        </DetailRow>

        <DetailRow label={t('governance.advanced.fields.supportCurve')}>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          {supportCurve && t(`governance.curves.${supportCurve}`)}
        </DetailRow>

        <DetailRow label={t('governance.advanced.fields.turnout')}>{turnout}</DetailRow>

        <DetailRow label={t('governance.advanced.fields.electorate')}>{electorate}</DetailRow>

        <DetailRow label={t('governance.advanced.fields.callHash')}>
          <div className="flex w-32 items-center gap-1 text-text-secondary">
            <Truncate className="text-footnote" start={6} end={5} text={proposal} />
            <IconButton name="copy" onClick={() => copyToClipboard(proposal)} />
          </div>
        </DetailRow>
      </div>
    </BaseModal>
  );
};
