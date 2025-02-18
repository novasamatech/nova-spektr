import { useUnit } from 'effector-react';

import { type Transaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { XcmChains } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { TransactionTitle, getTransactionAmount, isXcmTransaction } from '@/entities/transaction';

type Props = {
  coreTx: Transaction;
};

export const OperationTitle = ({ coreTx }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const asset = getAssetById(coreTx.args.asset, chains[coreTx.chainId]?.assets);
  const amount = getTransactionAmount(coreTx);

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t('operations.titles.crossChainTransfer', { asset: asset?.symbol })}
        icon="transferConfirm"
      />

      {asset && amount && (
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      {isXcmTransaction(coreTx) && (
        <XcmChains chainIdFrom={coreTx.chainId} chainIdTo={coreTx.args.destinationChain} className="w-[114px]" />
      )}
    </>
  );
};
