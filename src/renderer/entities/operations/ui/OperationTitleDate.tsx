import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { type MultisigOperation, multisigOperationService } from '@/domains/network';

type Props = {
  operation: MultisigOperation;
};

export const OperationTitleDate = ({ operation }: Props) => {
  const { formatDate } = useI18n();

  const initEvent = multisigOperationService.getApprovals(operation).find((e) => e.accountId === operation.depositor);
  const date = new Date(operation.timestamp || initEvent?.timestamp || Date.now());

  return (
    <div className="w-[58px] pr-1">
      <FootnoteText className="text-text-tertiary" align="right">
        {formatDate(date, 'p')}
      </FootnoteText>
    </div>
  );
};
