import cn from 'classnames';

import {
  MultisigTransaction,
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
  MultisigTxStatus,
} from '@renderer/entities/transaction';
import { CaptionText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

const StatusTitle: Record<MultisigTxStatus, string> = {
  [MultisigTxInitStatus.SIGNING]: 'operation.status.signing',
  [MultisigTxFinalStatus.CANCELLED]: 'operation.status.cancelled',
  [MultisigTxFinalStatus.ERROR]: 'operation.status.error',
  [MultisigTxFinalStatus.ESTABLISHED]: 'operation.status.established',
  [MultisigTxFinalStatus.EXECUTED]: 'operation.status.executed',
};

const StatusColor: Record<MultisigTxStatus, string> = {
  [MultisigTxInitStatus.SIGNING]: 'text-text-tertiary',
  [MultisigTxFinalStatus.CANCELLED]: 'text-text-negative',
  [MultisigTxFinalStatus.ERROR]: 'text-text-negative',
  [MultisigTxFinalStatus.ESTABLISHED]: 'text-text-tertiary',
  [MultisigTxFinalStatus.EXECUTED]: 'text-text-positive',
};

type Props = {
  status: MultisigTransaction['status'];
  signed?: number;
  threshold?: number;
  className?: string;
};

const OperationStatus = ({ status, signed, threshold, className }: Props) => {
  const { t } = useI18n();

  return (
    <CaptionText
      className={cn(
        'py-1 px-2.5 rounded-[20px] border border-redesign-shade-8 uppercase',
        StatusColor[status],
        className,
      )}
      align="center"
    >
      {status === 'SIGNING'
        ? t('operation.signing', {
            signed: signed,
            threshold: threshold || 0,
          })
        : t(StatusTitle[status])}
    </CaptionText>
  );
};

export default OperationStatus;
