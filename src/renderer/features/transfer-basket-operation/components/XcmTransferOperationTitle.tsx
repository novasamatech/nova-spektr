import { chainsService } from '@/shared/api/network';
import { type Transaction } from '@/shared/core';
import { type ChainError, type ClientError } from '@/shared/core/types/basket';
import { cnTw, getAssetById } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui';
import { BasketOperationStatus } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { XcmChains } from '@/entities/chain';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  coreTx: Transaction;
  error?: ChainError | ClientError;
  validating?: boolean;
  errorText?: string;
  onClick: () => void;
  onTxRemoved: () => void;
};

export const XcmTransferOperationTitle = ({ coreTx, error, errorText, validating, onClick, onTxRemoved }: Props) => {
  const asset = getAssetById(coreTx.args.asset, chainsService.getChainById(coreTx.chainId)?.assets);
  const amount = getTransactionAmount(coreTx);

  const disabled = errorText || validating;

  const onTxClicked = () => {
    if (disabled) return;

    onClick();
  };

  const handleTxRemoved = (event: any) => {
    event.preventDefault();
    event.stopPropagation();

    onTxRemoved();
  };

  return (
    <div
      className={cnTw('flex h-[52px] w-full items-center gap-x-4 overflow-hidden', !disabled && 'cursor-pointer')}
      onClick={onTxClicked}
    >
      <TransactionTitle className="flex-1 overflow-hidden" tx={coreTx} />

      {asset && amount && (
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      <XcmChains chainIdFrom={coreTx.chainId} chainIdTo={coreTx.args.destinationChain} className="w-[114px]" />

      <div className="flex w-[106px] justify-center">
        <BasketOperationStatus validating={validating} errorText={errorText} error={error} />
      </div>

      <IconButton name="delete" onClick={handleTxRemoved} />
    </div>
  );
};
