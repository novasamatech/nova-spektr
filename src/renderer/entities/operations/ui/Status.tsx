import { useI18n } from '@/shared/i18n';
import { OperationStatus } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';

const StatusTitle: Record<MultisigOperation['status'], string> = {
  pending: 'operation.status.signing',
  cancelled: 'operation.status.cancelled',
  error: 'operation.status.error',
  executed: 'operation.status.executed',
};

const StatusColor: Record<MultisigOperation['status'], 'default' | 'success' | 'error'> = {
  pending: 'default',
  cancelled: 'error',
  error: 'error',
  executed: 'success',
};

type Props = {
  status: MultisigOperation['status'];
  signed: number;
  threshold: number;
};

export const Status = ({ status, signed, threshold }: Props) => {
  const { t } = useI18n();

  const text = status === 'pending' ? t('operation.signing', { signed, threshold }) : t(StatusTitle[status]);

  return (
    <OperationStatus pallet={StatusColor[status]} className="w-fit shrink-0">
      {text}
    </OperationStatus>
  );
};
