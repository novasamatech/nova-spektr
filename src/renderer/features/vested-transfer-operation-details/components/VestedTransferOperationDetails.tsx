import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { type DecodedTransaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import { Button, DetailRow } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { type VestingSchedule, VestingSchedulePreviewModal } from '@/entities/vesting';

type Props = {
  operation: MultisigOperation;
};

export const VestedTransferOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);

  const { transaction, chainId } = operation;
  const chain = chains[chainId];

  if (nullable(transaction) || nullable(chain)) return null;

  const asset = getNativeAsset(chain.assets);

  const vestingSchedule: VestingSchedule[] =
    transaction.type === TransactionType.BATCH_ALL
      ? transaction.args.transactions.map(extractVestingSchedule)
      : [extractVestingSchedule(transaction)];

  return (
    <DetailRow label={t('operation.details.parsedFile')} className="text-text-secondary">
      <VestingSchedulePreviewModal
        chain={chain}
        asset={asset}
        vestingSchedule={vestingSchedule}
        trigger={
          <Button className="p-0" size="sm" variant="text">
            {t('vestedTransfer.parsedFile.buttons.openPreview')}
          </Button>
        }
      />
    </DetailRow>
  );
};

function extractVestingSchedule(tx: DecodedTransaction) {
  const {
    target,
    schedule: { locked, perBlock, startingBlock },
  } = tx.args;

  return {
    target,
    locked: new BN(locked),
    perBlock: new BN(perBlock),
    startingBlock: new BN(startingBlock),
  };
}
