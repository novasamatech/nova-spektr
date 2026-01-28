import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import { Button, DetailRow } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { type MultiTransferRow, MultiTransferPreview } from '@/entities/multi-transfer';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';

type Props = {
  operation: MultisigOperation;
};

export const MultiTransferOperationDetails = memo(({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);

  const { chainId } = operation;
  const chain = chains[chainId];
  const transaction = operationDetailsUtils.getCoreTx(operation);

  if (nullable(transaction) || nullable(chain)) return null;

  const asset = getNativeAsset(chain.assets);

  const transfers: MultiTransferRow[] =
    transaction.type === TransactionType.BATCH_ALL
      ? transaction.args.transactions.map(extractTransfer)
      : [extractTransfer(transaction)];

  return (
    <DetailRow label={t('operation.details.parsedFile')} className="text-text-secondary">
      <MultiTransferPreview chain={chain} asset={asset} transfers={transfers}>
        <Button className="p-0" size="sm" variant="text">
          {t('multiTransfer.parsedFile.buttons.openPreview')}
        </Button>
      </MultiTransferPreview>
    </DetailRow>
  );
});

function extractTransfer(tx: Transaction | DecodedTransaction): MultiTransferRow {
  const { dest, value } = tx.args;

  return {
    recipient: {
      raw: typeof dest === 'string' ? dest : dest.toString(),
      parsed: dest,
    },
    amount: {
      raw: typeof value === 'string' ? value : value.toString(),
      parsed: typeof value === 'string' ? new BN(value) : new BN(value.toString()),
    },
  };
}
