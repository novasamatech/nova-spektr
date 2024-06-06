import { Trans } from 'react-i18next';

import { ChainTitle, XcmChains } from '@entities/chain';
import { TransactionTitle, getTransactionAmount, isXcmTransaction } from '@entities/transaction';
import { chainsService } from '@shared/api/network';
import { getAssetById } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';
import { BasketTransaction } from '@shared/core';
import { Checkbox, HelpText, IconButton, Tooltip } from '@shared/ui';
import { basketModel } from '@entities/basket';
import { useI18n } from '@app/providers';

type Props = {
  tx: BasketTransaction;
  selected: boolean;
  invalid: boolean;
  onSelect: (value: boolean) => void;
};

export const Operation = ({ tx, invalid, selected, onSelect }: Props) => {
  const { t } = useI18n();

  const asset = getAssetById(tx.coreTx.args.asset, chainsService.getChainById(tx.coreTx.chainId)?.assets);
  const amount = getTransactionAmount(tx.coreTx);

  return (
    <div className="h-[52px] flex gap-x-4 px-4 items-center w-full overflow-hidden">
      <Checkbox checked={selected} onChange={(event) => onSelect(event.target.checked)} />
      <TransactionTitle className="flex-1 overflow-hidden" tx={tx.coreTx} />

      {asset && amount && (
        <div className="w-[160px]">
          <AssetBalance value={amount} asset={asset} showIcon />
        </div>
      )}

      {isXcmTransaction(tx.coreTx) ? (
        <XcmChains chainIdFrom={tx.coreTx.chainId} chainIdTo={tx.coreTx.args.destinationChain} className="w-[114px]" />
      ) : (
        <ChainTitle chainId={tx.coreTx.chainId} className="w-[114px]" />
      )}

      <div className="w-[87px] flex justify-center">
        {invalid && (
          <Tooltip offsetPx={-50} content={<Trans t={t} i18nKey="basket.invalidTransaction" />}>
            <div className="flex gap-x-1 items-center rounded-md bg-badge-red-background-default px-2 py-0.5">
              <HelpText className="text-text-negative">{t('basket.invalidTransaction')} </HelpText>
            </div>
          </Tooltip>
        )}
      </div>

      <IconButton name="delete" onClick={() => basketModel.events.transactionsRemoved([tx])} />
    </div>
  );
};
