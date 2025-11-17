import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Modal, ScrollArea } from '@/shared/ui-kit';
import { type Column, Table } from '@/shared/ui-kit/Table';
import { type VestingScheduleRaw } from '../lib/types';

type Props = {
  vestingSchedule: VestingScheduleRaw[];

  trigger: React.ReactNode;
};

export const VestingSchedulePreviewWithErrors = ({ vestingSchedule, trigger }: Props) => {
  const { t } = useI18n();

  const rowCount = vestingSchedule.length;

  const columns: Column<VestingScheduleRaw>[] = useMemo(
    () => [
      {
        key: 'target',
        title: t('vestedTransfer.parsedFile.table.headers.recipient'),
        width: '270px',
        render: (target) => <span className="shrink-0 text-body text-text-primary">{target}</span>,
      },
      {
        key: 'startingBlock',
        title: t('vestedTransfer.parsedFile.table.headers.startBlock'),
        width: '80px',
        render: (startingBlock) => (
          <div className="flex justify-end">
            <span className="shrink-0 text-body text-text-primary">{startingBlock}</span>
          </div>
        ),
      },
      {
        key: 'perBlock',
        title: t('vestedTransfer.parsedFile.table.headers.perBlock'),
        width: '120px',
        render: (perBlock) => (
          <div className="flex justify-end">
            <span className="shrink-0 text-body text-text-primary">{perBlock}</span>
          </div>
        ),
      },
      {
        key: 'locked',
        title: t('vestedTransfer.parsedFile.table.headers.locked'),
        width: '120px',
        render: (locked) => (
          <div className="flex justify-end">
            <span className="shrink-0 text-body text-text-primary">{locked}</span>
          </div>
        ),
      },
    ],
    [t],
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
