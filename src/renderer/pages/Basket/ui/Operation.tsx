import { Trans } from 'react-i18next';

import { ChainTitle, XcmChains } from '@entities/chain';
import { TransactionTitle, getTransactionAmount, isXcmTransaction } from '@entities/transaction';
import { chainsService } from '@shared/api/network';
import { cnTw, getAssetById } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';
import { BasketTransaction, TransactionType } from '@shared/core';
import { HelpText, IconButton, Shimmering, Tooltip } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainError } from '@shared/core/types/basket';
import { getCoreTx } from '../lib/utils';

type Props = {
  tx: BasketTransaction;
  validating?: boolean;
  errorText?: string;
  onClick: () => void;
  onTxRemoved: () => void;
};

export const Operation = ({ tx, errorText, validating, onClick, onTxRemoved }: Props) => {
  const { t } = useI18n();

  const coreTx = getCoreTx(tx, [TransactionType.UNSTAKE, TransactionType.BOND]);

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

  const getStatus = () => {
    if (validating) {
      return <Shimmering width={106} height={18} />;
    }

    if (tx.error) {
      return (
        <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey={tx.error.message} />}>
          <div className="flex gap-x-1 items-center rounded-md bg-badge-orange-background-default px-2 py-0.5">
            <HelpText className="text-text-warning">
              {t('basket.chainError', {
                date: (tx.error as ChainError).dateCreated
                  ? new Date((tx.error as ChainError).dateCreated).toLocaleDateString()
                  : '',
              })}
            </HelpText>
          </div>
        </Tooltip>
      );
    }

    if (errorText)
      return (
        <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey={errorText} />}>
          <div className="flex gap-x-1 items-center rounded-md bg-badge-red-background-default px-2 py-0.5">
            <HelpText className="text-text-negative">{t('basket.validationError')} </HelpText>
          </div>
        </Tooltip>
      );
  };

  return (
    <div
      className={cnTw('h-[52px] flex gap-x-4 items-center w-full overflow-hidden ', !disabled && 'cursor-pointer')}
      onClick={onTxClicked}
    >
      <TransactionTitle className="flex-1 overflow-hidden" tx={coreTx} />

      {asset && amount && (
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      {isXcmTransaction(coreTx) ? (
        <XcmChains chainIdFrom={coreTx.chainId} chainIdTo={coreTx.args.destinationChain} className="w-[114px]" />
      ) : (
        <ChainTitle chainId={coreTx.chainId} className="w-[114px]" />
      )}

      <div className="w-[106px] flex justify-center">{getStatus()}</div>

      <IconButton name="delete" onClick={handleTxRemoved} />
    </div>
  );
};
