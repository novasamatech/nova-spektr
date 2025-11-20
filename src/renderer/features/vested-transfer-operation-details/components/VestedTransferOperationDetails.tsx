import { useUnit } from 'effector-react';

import { type DecodedTransaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import { Button, DetailRow } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { VestingSchedulePreview, type VestingScheduleRaw } from '@/entities/vesting';

type Props = {
  operation: MultisigOperation;
};

export const VestedTransferOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);

  const { transaction, chainId } = operation;
  const chain = chains[chainId];

  if (nullable(transaction) || nullable(chain)) return null;

  const timelineChainId = chain.additional?.timelineChain;
  const timelineApi = (timelineChainId && apis[timelineChainId]) ?? apis[chain.chainId] ?? null;
  const asset = getNativeAsset(chain.assets);

  const vestingSchedule: VestingScheduleRaw[] =
    transaction.type === TransactionType.BATCH_ALL
      ? transaction.args.transactions.map(extractVestingSchedule)
      : [extractVestingSchedule(transaction)];

  return (
    <DetailRow label={t('operation.details.parsedFile')} className="text-text-secondary">
      <VestingSchedulePreview timelineApi={timelineApi} chain={chain} asset={asset} vestingSchedule={vestingSchedule}>
        <Button className="p-0" size="sm" variant="text">
          {t('vestedTransfer.parsedFile.buttons.openPreview')}
        </Button>
      </VestingSchedulePreview>
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
    locked,
    perBlock,
    startingBlock,
  };
}
