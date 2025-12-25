import { memo, useCallback, useMemo, useState } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText, FootnoteText } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Modal, ScrollArea, Tooltip } from '@/shared/ui-kit';
import { type Column, Table } from '@/shared/ui-kit/Table';
import { useAccountName } from '@/domains/network';
import { AssetFiatBalance } from '@/entities/price';
import { MultiTransferFieldError, type MultiTransferRow, type ValidationIssue } from '../lib/types';

type TableData = MultiTransferRow & {
  index: number;
};

type RowStatus = 'error' | 'valid';

const NUM_FORMATTER = new Intl.NumberFormat('en-US');

const STATUS_TEXT_COLORS: Record<RowStatus, string> = {
  error: 'text-text-negative',
  valid: 'text-text-primary',
};

type Props = {
  transfers: MultiTransferRow[];
  chain: Chain | null;
  asset: Asset | null;
  issues?: ValidationIssue[] | null;
  onDownloadClick?: () => void;
  children: React.ReactNode;
};

const MAX_VISIBLE_ROWS = 50;

export const MultiTransferPreview = memo(({ transfers, children, chain, asset, issues, onDownloadClick }: Props) => {
  const { t } = useI18n();
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_ROWS);

  const getRowIssues = useCallback(
    (rowIndex: number) => {
      if (!issues) return [];
      return issues.filter((issue) => issue.row === rowIndex);
    },
    [issues],
  );

  const getFieldIssues = useCallback(
    (rowIndex: number, field: 'recipient' | 'amount') => {
      if (!issues) return [];
      return issues.filter((issue) => issue.row === rowIndex && issue.path === field);
    },
    [issues],
  );

  const getRowStatus = useCallback((rowIssues: ValidationIssue[]): RowStatus => {
    if (rowIssues.length > 0) return 'error';
    return 'valid';
  }, []);

  const allData: TableData[] = useMemo(
    () => transfers.map((transfer, idx) => ({ ...transfer, index: idx + 1 })),
    [transfers],
  );

  const tableData = useMemo(() => allData.slice(0, visibleCount), [allData, visibleCount]);
  const hasMore = visibleCount < allData.length;

  const showMore = () => {
    setVisibleCount((prev) => Math.min(prev + MAX_VISIBLE_ROWS, allData.length));
  };

  const columns: Column<TableData>[] = useMemo(
    () => [
      {
        key: 'index',
        title: '',
        width: '50px',
        render: (_, row) => {
          const rowIssues = getRowIssues(row.index);
          const status = getRowStatus(rowIssues);
          return (
            <div className="flex justify-start">
              <span className={cnTw('shrink-0 text-body', STATUS_TEXT_COLORS[status])}>{row.index}</span>
            </div>
          );
        },
      },
      {
        key: 'recipient',
        title: t('multiTransfer.parsedFile.headers.recipient'),
        width: '460px',
        render: (_, row) => {
          const rowIssues = getRowIssues(row.index);
          const fieldIssues = getFieldIssues(row.index, 'recipient');
          const status = getRowStatus(rowIssues);

          return (
            <div className={cnTw('flex flex-col overflow-hidden', STATUS_TEXT_COLORS[status])}>
              {nullable(row.recipient.parsed) || nullable(chain) ? (
                <span className="break-all">{row.recipient.raw}</span>
              ) : (
                <TargetAccount recipient={row.recipient.parsed} chain={chain} />
              )}
              {fieldIssues.length > 0 && (
                <CaptionText className={cnTw('text-left text-inherit', STATUS_TEXT_COLORS[status])}>
                  {t(`multiTransfer.errors.csv.fieldErrors.${fieldIssues[0].message}`)}
                </CaptionText>
              )}
            </div>
          );
        },
      },
      {
        key: 'amount',
        title: (
          <div className="flex w-full justify-end">
            <span>{t('multiTransfer.parsedFile.headers.amount')}</span>
          </div>
        ),
        width: '200px',
        render: (_, row) => {
          const rowIssues = getRowIssues(row.index);
          const fieldIssues = getFieldIssues(row.index, 'amount');
          const status = getRowStatus(rowIssues);
          const hasInvalidValue = fieldIssues.some(
            (i) => i.severity === 'error' && i.message === MultiTransferFieldError.INVALID_VALUE,
          );

          return (
            <div className={cnTw('flex flex-col items-end overflow-hidden', STATUS_TEXT_COLORS[status])}>
              {hasInvalidValue || nullable(row.amount.parsed) || nullable(asset) ? (
                <span className="shrink-0 text-body">{row.amount.raw}</span>
              ) : (
                <Tooltip>
                  <Tooltip.Trigger>
                    <div className="flex flex-col items-end">
                      <AssetBalance
                        value={row.amount.parsed}
                        asset={asset}
                        showSymbol
                        className="border-b border-filter-border text-inherit"
                      />
                      <AssetFiatBalance asset={asset} amount={row.amount.parsed} className="text-inherit" />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {t('multiTransfer.parsedFile.table.hints.planks', {
                      amount: NUM_FORMATTER.format(BigInt(row.amount.raw)),
                    })}
                  </Tooltip.Content>
                </Tooltip>
              )}
              {fieldIssues.length > 0 && (
                <CaptionText className={cnTw('text-right text-inherit', STATUS_TEXT_COLORS[status])}>
                  {t(`multiTransfer.errors.csv.fieldErrors.${fieldIssues[0].message}`)}
                </CaptionText>
              )}
            </div>
          );
        },
      },
    ],
    [t, chain, asset, getRowIssues, getFieldIssues, getRowStatus],
  );

  const errorsCount = issues?.filter((issue) => issue.severity === 'error').length ?? 0;

  return (
    <Modal size="lg" height="fit">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <div className="flex gap-x-2">
          {t('multiTransfer.parsedFile.title')}&nbsp;
          <span className="text-text-secondary">{transfers.length}</span>
        </div>
      </Modal.Title>
      <Modal.Content>
        <div className="px-2 pb-3">
          <ScrollArea>
            <Table columns={columns} data={tableData} cellAlign="top" className="w-full rounded-lg" />
            {hasMore && (
              <div className="flex justify-center py-3">
                <Button variant="text" onClick={showMore}>
                  {t('multiTransfer.parsedFile.table.buttons.showMore')}
                </Button>
              </div>
            )}
          </ScrollArea>
        </div>
      </Modal.Content>
      {issues && issues.length > 0 && onDownloadClick && (
        <Modal.Footer>
          <div className="flex w-full flex-row items-center justify-between">
            <div className="flex flex-col">
              {errorsCount > 0 && (
                <FootnoteText className="text-text-negative">
                  {t('multiTransfer.parsedFile.table.footer.errorsCount', {
                    count: errorsCount,
                  })}
                </FootnoteText>
              )}
              <FootnoteText className="text-text-primary">
                {t('multiTransfer.parsedFile.table.footer.downloadDescription')}
              </FootnoteText>
            </div>
            <Button onClick={onDownloadClick}>{t('multiTransfer.parsedFile.table.buttons.download')}</Button>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
});

const TargetAccount = memo(({ recipient, chain }: { recipient: AccountId; chain: Chain }) => {
  const accountId = toAccountId(recipient);
  const accountName = useAccountName({ accountId, chain });
  return <Account accountId={recipient} title={accountName} chain={chain} variant="full" />;
});
