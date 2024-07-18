import { useI18n } from '@app/providers';
import { type Asset, type OngoingReferendum } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { copyToClipboard, formatBalance } from '@shared/lib/utils';
import { BaseModal, DetailRow, IconButton, Separator, Truncate } from '@shared/ui';
import { AddressWithName } from '@entities/wallet';
import { type AggregatedReferendum } from '../../types/structs';

type Props = {
  referendum: AggregatedReferendum<OngoingReferendum>;
  asset: Asset;
  onClose: VoidFunction;
};

export const AdvancedDialog = ({ asset, referendum, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, closeModal] = useModalClose(true, onClose);

  const { submissionDeposit, approvalThreshold, supportThreshold, tally, proposal } = referendum;
  const approvalCurve = approvalThreshold?.curve?.type;
  const supportCurve = supportThreshold?.curve?.type;

  const electrorateBalance = formatBalance(tally.ayes.add(tally.nays).add(tally.support), asset.precision);
  const electrorate = `${electrorateBalance.formatted} ${asset.symbol}`;

  const turnoutBalance = supportThreshold
    ? formatBalance(supportThreshold.value.sub(tally.support), asset.precision)
    : null;
  const turnout = `${turnoutBalance?.formatted ?? 0} ${asset.symbol}`;

  const deposit = submissionDeposit
    ? `${formatBalance(submissionDeposit.amount, asset.precision).formatted} ${asset.symbol}`
    : null;

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      panelClass="w-modal"
      contentClass="flex flex-col gap-4 py-4 ps-5 pe-3"
      title={t('governance.advanced.title')}
      onClose={closeModal}
    >
      <DetailRow label={t('governance.advanced.fields.proposer')}>
        {submissionDeposit && (
          <AddressWithName
            className="px-2"
            address={submissionDeposit.who}
            addressFont="text-footnote text-text-secondary"
            type="short"
            symbols={8}
          />
        )}
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

        <DetailRow label={t('governance.advanced.fields.electrorate')}>{electrorate}</DetailRow>

        <DetailRow label={t('governance.advanced.fields.callHash')}>
          <div className="flex items-center gap-1 text-text-secondary w-32">
            <Truncate className="text-footnote" start={6} end={5} text={proposal} />
            <IconButton name="copy" onClick={() => copyToClipboard(proposal)} />
          </div>
        </DetailRow>
      </div>
    </BaseModal>
  );
};
