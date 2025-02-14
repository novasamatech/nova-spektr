import { useUnit } from 'effector-react';

import { type Transaction } from '@/shared/core';
import { type ChainError, type ClientError } from '@/shared/core/types/basket';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { BasketOperationStatus } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  coreTx: Transaction;
  error?: ChainError | ClientError;
  validating?: boolean;
  errorText?: string;
};

export const TransferOperationTitle = ({ coreTx, error, errorText, validating }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const asset = getAssetById(coreTx.args.asset, chains[coreTx.chainId]?.assets);
  const amount = getTransactionAmount(coreTx);

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={t('operations.titles.transfer', { asset: asset?.symbol })}
        icon="transferConfirm"
      />

      {asset && amount && (
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      <ChainTitle chainId={coreTx.chainId} className="w-[114px]" />

      <div className="flex w-[106px] justify-center">
        <BasketOperationStatus validating={validating} errorText={errorText} error={error} />
      </div>
    </>
  );
};
