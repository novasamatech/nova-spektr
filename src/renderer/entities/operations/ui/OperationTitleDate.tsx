import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';

type Props = {
  operation: MultisigOperation;
};

export const OperationTitleDate = ({ operation }: Props) => {
  const { formatDate } = useI18n();
  const { events } = operation;

  const approvals = events.filter((e) => e.status === 'approve');
  const initEvent = approvals.find((e) => e.accountId === operation.depositor);
  const date = Number(operation.timestamp) || Number(initEvent?.timestamp) || Date.now();

  return (
    <div className="w-[58px] shrink-0 pr-1">
      <FootnoteText className="text-text-tertiary" align="right">
        {formatDate(date, 'p')}
      </FootnoteText>
    </div>
  );
};
