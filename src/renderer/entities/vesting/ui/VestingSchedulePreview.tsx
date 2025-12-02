import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { format } from 'date-fns';
import { type PropsWithChildren, memo, useCallback, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText, FootnoteText, Icon } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Modal, ScrollArea, Tooltip } from '@/shared/ui-kit';
import { type Column, Table } from '@/shared/ui-kit/Table';
import { useBlockTimestamp, useIdentity } from '@/domains/network';
import { type ValidationIssue, VestingFieldError, type VestingScheduleRaw } from '../lib/types';

type TableData = VestingScheduleRaw & {
  index: number;
};

type RowStatus = 'error' | 'warning' | 'valid';

type CellComponentProps = {
  row: TableData;
  field: keyof VestingScheduleRaw;
  status: RowStatus;
};

type Props = PropsWithChildren & {
  vestingSchedule: VestingScheduleRaw[];
  children: React.ReactNode;
  timelineApi: ApiPromise | null;
  chain: Chain | null;
  asset: Asset | null;
  issues?: ValidationIssue[] | null;
  minVestedTransfer?: BN | null;
  onDownloadClick?: () => void;
};

const PAGE_SIZE = 50;

export const VestingSchedulePreview = memo(
  ({ vestingSchedule, children, timelineApi, chain, asset, issues, minVestedTransfer, onDownloadClick }: Props) => {
    const { t } = useI18n();
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const showMore = () => setVisibleCount((prev) => prev + PAGE_SIZE);

    const issuesByRow = useMemo(() => {
      if (!issues) return new Map<number, ValidationIssue[]>();

      return issues.reduce((acc, issue) => {
        const list = acc.get(issue.row) || [];
        list.push(issue);
        acc.set(issue.row, list);

        return acc;
      }, new Map<number, ValidationIssue[]>());
    }, [issues]);

    const getRowIssues = useCallback((row: number) => issuesByRow.get(row) || [], [issuesByRow]);

    const getFieldIssues = useCallback(
      (row: number, field: keyof VestingScheduleRaw) => getRowIssues(row).filter((i) => i.path === field),
      [getRowIssues],
    );

    const renderCell = useCallback(
      (row: TableData, field: keyof VestingScheduleRaw, Component: React.ComponentType<CellComponentProps>) => {
        const rowIssues = getRowIssues(row.index);
        const fieldIssues = getFieldIssues(row.index, field);
        const status = getRowStatus(rowIssues);
        const hasInvalidValue = fieldIssues.some(
          (i) => i.severity === 'error' && i.message === VestingFieldError.INVALID_VALUE,
        );

        return (
          <div className={cnTw('flex flex-col items-end overflow-hidden', STATUS_TEXT_COLORS[status])}>
            {hasInvalidValue ? (
              <span className="shrink-0 text-body">{row[field]}</span>
            ) : (
              <Component row={row} field={field} status={status} />
            )}

            {fieldIssues.length > 0 && (
              <FieldIssues issue={fieldIssues[0]} asset={asset} minVestedTransfer={minVestedTransfer} />
            )}
          </div>
        );
      },
      [getRowIssues, getFieldIssues],
    );

    const allData = useMemo(
      () => vestingSchedule.map((vesting, index) => ({ ...vesting, index: index + 1 })),
      [vestingSchedule],
    );
    const tableData = useMemo(() => allData.slice(0, visibleCount), [allData, visibleCount]);
    const hasMore = visibleCount < allData.length;

    const columns: Column<TableData>[] = useMemo(
      () => [
        {
          key: 'index',
          title: '',
          width: '50px',
          render: (_, row) => {
            return (
              <div className="flex justify-start">
                <span className="shrink-0 text-body text-text-tertiary">{row.index}</span>
              </div>
            );
          },
        },
        {
          key: 'target',
          title: t('vestedTransfer.parsedFile.table.headers.recipient'),
          width: '428px',
          render: (_, row) => {
            if (nullable(row.target) || nullable(chain)) return null;
            const rowIssues = getRowIssues(row.index);
            const fieldIssues = getFieldIssues(row.index, 'target');
            const status = getRowStatus(rowIssues);

            return (
              <div className={cnTw('flex flex-col overflow-hidden', STATUS_TEXT_COLORS[status])}>
                <TargetAccount target={row.target} chain={chain} />
                {fieldIssues.length > 0 && (
                  <FieldIssues
                    issue={fieldIssues[0]}
                    className="text-left"
                    asset={asset}
                    minVestedTransfer={minVestedTransfer}
                  />
                )}
              </div>
            );
          },
        },
        {
          key: 'locked',
          title: (
            <div className="flex w-full justify-end">
              <span>{t('vestedTransfer.parsedFile.table.headers.locked')}</span>
            </div>
          ),
          width: '120px',
          render: (_, row) =>
            renderCell(row, 'locked', ({ row }) =>
              row.locked && asset ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <div>
                      <AssetBalance
                        value={row.locked}
                        asset={asset}
                        showSymbol
                        className="border-b border-filter-border text-inherit"
                      />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {t('vestedTransfer.parsedFile.table.hints.planks', {
                      amount: NUM_FORMATTER.format(BigInt(row.locked)),
                    })}
                  </Tooltip.Content>
                </Tooltip>
              ) : (
                <span className="shrink-0 text-body">{row.locked}</span>
              ),
            ),
        },
        {
          key: 'startingBlock',
          title: (
            <div className="flex w-full justify-end gap-x-1">
              <span>{t('vestedTransfer.parsedFile.table.headers.startBlock')}</span>
              <Tooltip>
                <Tooltip.Trigger>
                  <div>
                    <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('vestedTransfer.parsedFile.table.hints.startBlock')}</Tooltip.Content>
              </Tooltip>
            </div>
          ),
          width: '120px',
          render: (_, row) =>
            renderCell(row, 'startingBlock', ({ row, status }) => (
              <StartingBlock timelineApi={timelineApi} status={status} startingBlock={row.startingBlock} />
            )),
        },
        {
          key: 'perBlock',
          title: (
            <div className="flex w-full justify-end gap-x-1">
              <span>{t('vestedTransfer.parsedFile.table.headers.perBlock')}</span>
              <Tooltip>
                <Tooltip.Trigger>
                  <div>
                    <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('vestedTransfer.parsedFile.table.hints.perBlock')}</Tooltip.Content>
              </Tooltip>
            </div>
          ),
          width: '120px',
          render: (_, row) =>
            renderCell(row, 'perBlock', ({ row }) =>
              row.perBlock && asset ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <div>
                      <AssetBalance
                        value={row.perBlock}
                        asset={asset}
                        showSymbol
                        className="border-b border-filter-border text-inherit"
                      />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {t('vestedTransfer.parsedFile.table.hints.planks', {
                      amount: NUM_FORMATTER.format(BigInt(row.perBlock)),
                    })}
                  </Tooltip.Content>
                </Tooltip>
              ) : (
                <span className="shrink-0 text-body">{row.perBlock}</span>
              ),
            ),
        },
      ],
      [t, chain, asset, getRowIssues, getFieldIssues, timelineApi],
    );

    return (
      <Modal size="xl" height="fit">
        <Modal.Trigger>{children}</Modal.Trigger>
        <Modal.Title close>
          <div className="flex gap-x-2">
            {t('vestedTransfer.parsedFile.title')}&nbsp;
            <span className="text-text-secondary">{vestingSchedule.length}</span>
          </div>
        </Modal.Title>
        <Modal.Content>
          <div className="px-2 pb-3">
            <ScrollArea>
              <Table columns={columns} data={tableData} cellAlign="top" className="w-full rounded-lg" />
              {hasMore && (
                <div className="flex justify-center py-3">
                  <Button variant="text" onClick={showMore}>
                    {t('vestedTransfer.parsedFile.table.buttons.showMore')}
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
        </Modal.Content>
        <IssuesFooter issues={issues} onDownloadClick={onDownloadClick} />
      </Modal>
    );
  },
);

const FieldIssues = memo(
  ({
    issue,
    className,
    minVestedTransfer,
    asset,
  }: {
    issue: ValidationIssue;
    minVestedTransfer?: BN | null;
    asset: Asset | null;
    className?: string;
  }) => {
    const { t } = useI18n();

    const isMinVestedTransferError =
      issue.message === VestingFieldError.MIN_VESTED_TRANSFER && nonNullable(minVestedTransfer);

    if (isMinVestedTransferError && nonNullable(asset)) {
      return (
        <div className="flex flex-col">
          <CaptionText className={cnTw('text-right text-inherit', className)}>
            <Trans
              t={t}
              i18nKey="vestedTransfer.errors.csv.fieldErrors.MIN_VESTED_TRANSFER"
              components={{
                asset: (
                  <AssetBalance
                    className="text-caption text-inherit"
                    value={minVestedTransfer}
                    asset={asset}
                    showSymbol
                  />
                ),
              }}
            />
          </CaptionText>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <CaptionText className={cnTw('text-right text-inherit', className)}>
          {t(`vestedTransfer.errors.csv.fieldErrors.${issue.message}`)}
        </CaptionText>
      </div>
    );
  },
);

const TargetAccount = memo(({ target, chain }: { target: AccountId; chain: Chain }) => {
  const accountId = toAccountId(target);
  const { data: identity } = useIdentity(accountId, chain.chainId);
  return <Account accountId={target} title={identity?.name} chain={chain} variant="full" />;
});

const StartingBlock = memo(
  ({
    timelineApi,
    status,
    startingBlock,
  }: {
    timelineApi: ApiPromise | null;
    status: RowStatus;
    startingBlock: string;
  }) => {
    const { t } = useI18n();

    const blockNum = Number(startingBlock);
    const startingBlockHeight = blockNum > 0 ? pjsSchema.helpers.toBlockHeight(blockNum) : null;

    const { data: blockTime } = useBlockTimestamp({
      api: timelineApi,
      blockHeight: startingBlockHeight,
    });

    const date = nonNullable(blockTime) ? format(blockTime, 'dd.MM.yyyy') : null;
    const time = nonNullable(blockTime) ? format(blockTime, 'H:mm') : null;

    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div>
            <span className={cnTw('shrink-0 border-b border-filter-border text-body', STATUS_TEXT_COLORS[status])}>
              {NUM_FORMATTER.format(BigInt(startingBlock))}
            </span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{t('vestedTransfer.parsedFile.table.hints.startBlockTime', { date, time })}</Tooltip.Content>
      </Tooltip>
    );
  },
);

type IssuesFooterProps = {
  issues?: ValidationIssue[] | null;
  onDownloadClick?: () => void;
};

const IssuesFooter = memo(({ issues, onDownloadClick }: IssuesFooterProps) => {
  const { t } = useI18n();

  if (nullable(onDownloadClick) || nullable(issues) || issues.length === 0) {
    return null;
  }

  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;

  return (
    <Modal.Footer>
      <div className="flex w-full flex-row items-center justify-between">
        <div className="flex flex-col">
          {errorCount > 0 && (
            <FootnoteText className="text-text-negative">
              {t('vestedTransfer.parsedFile.table.footer.errorsCount', { count: errorCount })}
            </FootnoteText>
          )}
          {warningCount > 0 && (
            <FootnoteText className="text-text-warning">
              {t('vestedTransfer.parsedFile.table.footer.warningsCount', { count: warningCount })}
            </FootnoteText>
          )}
          <FootnoteText className="text-text-primary">
            {t('vestedTransfer.parsedFile.table.footer.downloadDescription')}
          </FootnoteText>
        </div>
        <Button onClick={onDownloadClick}>{t('vestedTransfer.parsedFile.table.buttons.download')}</Button>
      </div>
    </Modal.Footer>
  );
});

const NUM_FORMATTER = new Intl.NumberFormat('en-US');

const STATUS_TEXT_COLORS: Record<RowStatus, string> = {
  error: 'text-text-negative',
  warning: 'text-text-warning',
  valid: 'text-text-primary',
};

const getRowStatus = (issues: ValidationIssue[]): RowStatus => {
  if (issues.some((i) => i.severity === 'error')) return 'error';
  if (issues.some((i) => i.severity === 'warning')) return 'warning';
  return 'valid';
};
