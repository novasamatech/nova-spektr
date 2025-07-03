import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { OperationTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { isTransferTransaction, isXcmTransaction } from '@/entities/transaction';
import { type BasketTransaction, basketOperationsService } from '@/aggregates/basket-operations';

type Props = {
  transaction: BasketTransaction;
};

export const ConfirmTitle = ({ transaction }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const tx = basketOperationsService.getCoreTx(transaction);
  const chain = chains[tx.chainId];
  const asset = getAssetById(tx.args.assetId, chain.assets);

  if (isTransferTransaction(tx)) {
    return (
      <OperationTitle
        className="justify-center"
        title={t('transfer.title', { asset: asset?.symbol })}
        chainId={tx.chainId}
      />
    );
  }

  if (isXcmTransaction(tx)) {
    return (
      <OperationTitle
        className="justify-center"
        title={t('transfer.xcmTitle', { asset: asset?.symbol })}
        chainId={tx.chainId}
      />
    );
  }

  return null;
};
