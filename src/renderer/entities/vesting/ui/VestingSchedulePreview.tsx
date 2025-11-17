import { useMemo } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Modal, ScrollArea } from '@/shared/ui-kit';
import { type Column, Table } from '@/shared/ui-kit/Table';
import { type VestingSchedule } from '../lib/types';

type Props = {
  chain: Chain;
  asset: Asset;
  vestingSchedule: VestingSchedule[];

  trigger: React.ReactNode;
};

export const VestingSchedulePreview = ({ chain, asset, vestingSchedule, trigger }: Props) => {
  const { t } = useI18n();

  const rowCount = vestingSchedule.length;

  const columns: Column<VestingSchedule>[] = useMemo(
    () => [
      {
        key: 'target',
        title: t('vestedTransfer.parsedFile.table.headers.recipient'),
        width: '270px',
        render: (target) => <Account accountId={target as AccountId} chain={chain} variant="full" />,
      },
      {
        key: 'startingBlock',
        title: t('vestedTransfer.parsedFile.table.headers.startBlock'),
        width: '80px',
        render: (startingBlock) => (
          <span className="shrink-0 text-body text-text-primary">{startingBlock.toString()}</span>
        ),
      },
      {
        key: 'perBlock',
        title: t('vestedTransfer.parsedFile.table.headers.perBlock'),
        width: '120px',
        render: (perBlock) => <span className="shrink-0 text-body text-text-primary">{perBlock.toString()}</span>,
      },
      {
        key: 'locked',
        title: t('vestedTransfer.parsedFile.table.headers.locked'),
        width: '120px',
        render: (locked) => (
          <div className="flex justify-end">
            <AssetBalance value={locked} asset={asset} showSymbol />
          </div>
        ),
      },
    ],
    [t, chain],
  );

  return (
    <Modal size="xl" height="fit">
      <Modal.Trigger>{trigger}</Modal.Trigger>
      <Modal.Title close>
        <div className="flex gap-x-2">
          {t('vestedTransfer.parsedFile.title')}&nbsp;
          <span className="text-text-secondary">{rowCount}</span>
        </div>
      </Modal.Title>
      <Modal.Content>
        <div className="px-2 pb-3">
          <ScrollArea>
            <Table columns={columns} data={vestingSchedule} className="w-full rounded-lg" />
          </ScrollArea>
        </div>
      </Modal.Content>
    </Modal>
  );
};
