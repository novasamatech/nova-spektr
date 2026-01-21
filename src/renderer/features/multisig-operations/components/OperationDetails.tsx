import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';

type Props = {
  operation: MultisigOperation;
};

export const OperationDetails = ({ operation }: Props) => {
  const { t, formatDate } = useI18n();

  const events = operation.events;
  const approvals = events.filter((e) => e.status === 'approve');
  const initEvent = approvals.find((e) => e.accountId === operation.depositor);
  const date = new Date(operation.timestamp || initEvent?.timestamp || Date.now());

  return (
    <DetailRow label={t('operation.details.dateTime')}>
      <span>{formatDate(date, 'PPp')}</span>
    </DetailRow>
  );
};
