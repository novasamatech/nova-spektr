import { chainsService } from '@/shared/api/network';
import { type Transaction } from '@/shared/core';
import { type ChainError, type ClientError } from '@/shared/core/types/basket';
import { cnTw, getAssetById } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui';
import { BasketOperationStatus } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { TransactionTitle, getTransactionAmount } from '@/entities/transaction';

type Props = {
  coreTx: Transaction;
  error?: ChainError | ClientError;
  validating?: boolean;
  errorText?: string;
  onClick: () => void;
  onTxRemoved: () => void;
};

export const ProxyOperationTitle = ({ coreTx, error, errorText, validating, onTxRemoved }: Props) => {
  const asset = getAssetById(coreTx.args.asset, chainsService.getChainById(coreTx.chainId)?.assets);
  const amount = getTransactionAmount(coreTx);

  const disabled = errorText || validating;

  const handleTxRemoved = (event: any) => {
    event.preventDefault();
    event.stopPropagation();

    onTxRemoved();
  };

  return (
    <div className={cnTw('flex h-[52px] w-full items-center gap-x-4 overflow-hidden', !disabled && 'cursor-pointer')}>
      <TransactionTitle className="flex-1 overflow-hidden" tx={coreTx} />

      {asset && amount && (
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      <ChainTitle chainId={coreTx.chainId} className="w-[114px]" />

      <div className="flex w-[106px] justify-center">
        <BasketOperationStatus validating={validating} errorText={errorText} error={error} />
      </div>

      <IconButton name="delete" onClick={handleTxRemoved} />

      {/* <ConfirmModal
        panelClass="w-[240px]"
        isOpen={Boolean(txToRemove)}
        confirmText={t('basket.removeConfirm.proceedButton')}
        confirmPallet="error"
        cancelText={t('basket.removeConfirm.cancelButton')}
        onClose={basketPageModel.events.removeTxCancelled}
        onConfirm={() => txToRemove && basketPageModel.events.txRemoved(txToRemove)}
      >
        <SmallTitleText align="center">{t('basket.removeConfirm.title')}</SmallTitleText>
        <FootnoteText className="mt-2 text-text-tertiary" align="center">
          {t('basket.removeConfirm.description')}
        </FootnoteText>
      </ConfirmModal> */}
    </div>
  );
};
