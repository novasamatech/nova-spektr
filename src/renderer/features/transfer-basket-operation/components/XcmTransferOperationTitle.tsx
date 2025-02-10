import { useUnit } from 'effector-react';

import { type Transaction } from '@/shared/core';
import { type BasketTransaction, type ChainError, type ClientError } from '@/shared/core/types/basket';
import { useI18n } from '@/shared/i18n';
import { cnTw, getAssetById } from '@/shared/lib/utils';
import { BasketOperationStatus } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { XcmChains } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';
import { RemoveOperation } from '@/features/basket-operations';

type Props = {
  operation: BasketTransaction;
  coreTx: Transaction;
  error?: ChainError | ClientError;
  validating?: boolean;
  errorText?: string;
};

export const XcmTransferOperationTitle = ({ operation, coreTx, error, errorText, validating }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const asset = getAssetById(coreTx.args.asset, chains[coreTx.chainId]?.assets);
  const amount = getTransactionAmount(coreTx);

  const disabled = errorText || validating;

  return (
    <div className={cnTw('flex h-[52px] w-full items-center gap-x-4 overflow-hidden', !disabled && 'cursor-pointer')}>
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

      <XcmChains chainIdFrom={coreTx.chainId} chainIdTo={coreTx.args.destinationChain} className="w-[114px]" />

      <div className="flex w-[106px] justify-center">
        <BasketOperationStatus validating={validating} errorText={errorText} error={error} />
      </div>

      <RemoveOperation operation={operation} />
    </div>
  );
};
