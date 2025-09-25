import { useUnit } from 'effector-react';

import { type Transaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getAssetByOnChainId } from '@/shared/lib/utils';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { ChainTitle, XcmChains } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { TransactionTitle, getTransactionAmount, isXcmTransaction } from '@/entities/transaction';

type Props = {
  coreTx: Transaction;
};

export const OperationTitle = ({ coreTx }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const asset = getAssetByOnChainId(coreTx.args.asset, chains[coreTx.chainId]?.assets);
  const amount = getTransactionAmount(coreTx);

  return (
    <>
      <TransactionTitle
        className="w-[186px] shrink-0"
        title={isXcmTransaction(coreTx) ? t('operations.titles.crossChainTransfer') : t('operations.titles.transfer')}
        icon="transferConfirm"
      />

      {asset && amount && (
        <Box width="160px" direction="row" gap={2} verticalAlign="center">
          <AssetIcon asset={asset} size={32} />
          <AssetBalance value={amount} asset={asset} />
        </Box>
      )}

      {isXcmTransaction(coreTx) ? (
        <XcmChains chainIdFrom={coreTx.chainId} chainIdTo={coreTx.args.destinationChain} />
      ) : (
        <ChainTitle chainId={coreTx.chainId} />
      )}
    </>
  );
};
