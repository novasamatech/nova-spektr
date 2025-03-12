import { chainsService } from '@/shared/api/network';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { operationDetailsUtils } from '@/entities/operations';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  title: string;
  operation: MultisigOperation;
};

export const ProxyOperationTitle = ({ operation, title }: Props) => {
  const { t } = useI18n();
  const transaction = operationDetailsUtils.getOperationData(operation);

  const asset =
    transaction && getAssetById(transaction.args?.asset, chainsService.getChainById(operation.chainId)?.assets);
  const amount = transaction && getTransactionAmount(transaction);

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" title={t(title || '')} icon="proxyMst" />

      {asset && amount && (
        <Box width="160px" direction="row" gap={2} verticalAlign="center">
          <AssetIcon asset={asset} size={32} />
          <AssetBalance value={amount} asset={asset} />
        </Box>
      )}

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
};
