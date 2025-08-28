import { useI18n } from '@/shared/i18n';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';

type Props = {
  title: string;
  operation: MultisigOperation;
};

export const FlexibleOperationTitle = ({ operation, title }: Props) => {
  const { t } = useI18n();

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" title={t(title || '')} />
      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
