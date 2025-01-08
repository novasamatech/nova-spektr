import { Trans } from 'react-i18next';

import { chainsService } from '@/shared/api/network';
import { type BasketTransaction } from '@/shared/core';
import { type ChainError } from '@/shared/core/types/basket';
import { useI18n } from '@/shared/i18n';
import { cnTw, getAssetById } from '@/shared/lib/utils';
import { HelpText, IconButton, Shimmering } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle, XcmChains } from '@/entities/chain';
import { TransactionTitle, getTransactionAmount, isXcmTransaction } from '@/entities/transaction';
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

  const coreTx = getCoreTx(tx);

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

    if (errorText) {
      return (
        <Tooltip>
          <Tooltip.Trigger>
            <div className="flex w-[106px] items-center justify-center gap-x-1 rounded-md bg-badge-red-background-default px-2 py-0.5">
              <HelpText className="text-text-negative">{t('basket.validationError')} </HelpText>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Trans t={t} i18nKey={errorText} />
          </Tooltip.Content>
        </Tooltip>
      );
    }

    if (tx.error) {
      return (
        <Tooltip>
          <Tooltip.Trigger>
            <div className="flex w-[106px] items-center justify-center gap-x-1 rounded-md bg-badge-orange-background-default px-2 py-0.5">
              <HelpText className="text-text-warning">
                {t('basket.chainError', {
                  date: (tx.error as ChainError).dateCreated
                    ? // TODO: Use formatDate from i18n
                      new Date((tx.error as ChainError).dateCreated).toLocaleDateString()
                    : '',
                })}
              </HelpText>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Trans t={t} i18nKey={tx.error.message} />{' '}
          </Tooltip.Content>
        </Tooltip>
      );
    }
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

      {isXcmTransaction(coreTx) ? (
        <XcmChains chainIdFrom={coreTx.chainId} chainIdTo={coreTx.args.destinationChain} className="w-[114px]" />
      ) : (
        <ChainTitle chainId={coreTx.chainId} className="w-[114px]" />
      )}

      <div className="flex w-[106px] justify-center">{getStatus()}</div>

      <IconButton name="delete" onClick={handleTxRemoved} />
    </div>
  );
};
