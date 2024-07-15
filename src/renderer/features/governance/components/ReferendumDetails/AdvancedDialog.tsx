import { BaseModal, DetailRow, Separator } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useModalClose } from '@shared/lib/hooks';
import { AggregatedReferendum } from '../../types/structs';
import { AddressWithName } from '@entities/wallet';

type Props = {
  referendum: AggregatedReferendum;
  onClose: VoidFunction;
};

export const AdvancedDialog = ({ referendum, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, closeModal] = useModalClose(true, onClose);

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      panelClass="w-modal"
      contentClass="flex flex-col gap-4 py-4 ps-5 pe-3"
      title={t('governance.advanced.title')}
      onClose={closeModal}
    >
      <DetailRow label={'Proposer'}>
        <AddressWithName addressFont="text-footnote" address={'0xfdsfsdaf'} />
      </DetailRow>
      <DetailRow label={'Deposit'}>test</DetailRow>
      <Separator className="text-filter-border" />
      <DetailRow label={'Approve curve'}>{referendum.approvalThreshold?.curve.type}</DetailRow>
      <DetailRow label={'Support curve'}>{referendum.supportThreshold?.curve.type}</DetailRow>
      <DetailRow label={'Turnout'}>test</DetailRow>
      <DetailRow label={'Electrorate'}>test</DetailRow>
      <DetailRow label={'Call hash'}>test</DetailRow>
    </BaseModal>
  );
};
