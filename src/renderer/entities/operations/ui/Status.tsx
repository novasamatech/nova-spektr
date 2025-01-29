import {
  type MultisigTransaction,
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
  type MultisigTxStatus,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { OperationStatus } from '@/shared/ui';

const StatusTitle: Record<MultisigTxStatus, string> = {
  [MultisigTxInitStatus.SIGNING]: 'operation.status.signing',
  [MultisigTxFinalStatus.CANCELLED]: 'operation.status.cancelled',
  [MultisigTxFinalStatus.ERROR]: 'operation.status.error',
  [MultisigTxFinalStatus.ESTABLISHED]: 'operation.status.established',
  [MultisigTxFinalStatus.EXECUTED]: 'operation.status.executed',
};

const StatusColor: Record<MultisigTxStatus, 'default' | 'success' | 'error'> = {
  [MultisigTxInitStatus.SIGNING]: 'default',
  [MultisigTxFinalStatus.ESTABLISHED]: 'default',
  [MultisigTxFinalStatus.EXECUTED]: 'success',
  [MultisigTxFinalStatus.CANCELLED]: 'error',
  [MultisigTxFinalStatus.ERROR]: 'error',
};

type Props = {
  status: MultisigTransaction['status'];
  signed: number;
  threshold: number;
};

export const Status = ({ status, signed, threshold }: Props) => {
  const { t } = useI18n();

  const text = status === 'SIGNING' ? t('operation.signing', { signed, threshold }) : t(StatusTitle[status]);

  return (
    <OperationStatus pallet={StatusColor[status]} className="w-fit shrink-0">
      {text}
    </OperationStatus>
  );
};
