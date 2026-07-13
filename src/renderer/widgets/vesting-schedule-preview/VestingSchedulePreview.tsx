import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { format } from 'date-fns';
import {
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Modal, ScrollArea, Tooltip } from '@/shared/ui-kit';
import { type Column, Table } from '@/shared/ui-kit/Table';
import { useBlockTimestamp } from '@/domains/network';
import { type ValidationIssue, type VestingScheduleRaw, VestingFieldError } from '@/domains/vesting';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';

import { CliffMinVestedTransferError } from './CliffMinVestedTransferError';
import { MinVestedTransferError } from './MinVestedTransferError';

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
  children: ReactNode;
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
      (row: TableData, field: keyof VestingScheduleRaw, Component: ComponentType<CellComponentProps>) => {
        const rowIssues = getRowIssues(row.index);
        const fieldIssues = getFieldIssues(row.index, field);
        const status = getRowStatus(rowIssues);
        const hasInvalidValue = fieldIssues.some(
          (i) => i.severity === 'error' && i.message === VestingFieldError.INVALID_VALUE,
        );
        const remainingLockedAmount =
          row.locked && row.unlockedAtStartBlock
            ? new BN(row.locked).sub(new BN(row.unlockedAtStartBlock)).toString()
            : null;

        return (
          <div className={cnTw('flex flex-col items-end overflow-hidden', STATUS_TEXT_COLORS[status])}>
            {hasInvalidValue ? (
              <span className="shrink-0 text-body">{row[field]}</span>
            ) : (
              <Component row={row} field={field} status={status} />
            )}

            {fieldIssues.length > 0 && (
              <FieldIssues
                issue={fieldIssues[0]!}
                asset={asset}
                minVestedTransfer={minVestedTransfer}
                remainingLockedAmount={remainingLockedAmount}
              />
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
    const hasUnlockedAtStartBlock = vestingSchedule.some((schedule) => nonNullable(schedule.unlockedAtStartBlock));

    const columns: Column<TableData>[] = useMemo(() => {
      const baseColumns: Column<TableData>[] = [
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
          width: '465px',
          render: (_, row) => {
            if (nullable(row.target) || nullable(chain)) return null;
            const rowIssues = getRowIssues(row.index);
            const fieldIssues = getFieldIssues(row.index, 'target');
            const status = getRowStatus(rowIssues);

            return (
              <div className={cnTw('flex flex-col overflow-hidden', STATUS_TEXT_COLORS[status])}>
                <NamedAccount accountId={toAccountId(row.target)} chain={chain} variant="full" />
                {fieldIssues.length > 0 && (
                  <FieldIssues
                    issue={fieldIssues[0]!}
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
            <div className="flex w-full justify-end gap-x-1">
              <span>{t('vestedTransfer.parsedFile.table.headers.locked')}</span>
              <Tooltip>
                <Tooltip.Trigger>
                  <div>
                    <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('vestedTransfer.parsedFile.table.hints.locked')}</Tooltip.Content>
              </Tooltip>
            </div>
          ),
          width: '120px',
          render: (_, row) =>
            renderCell(row, 'locked', ({ row }) =>
              row.locked && asset ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <div className="flex flex-col items-end">
                      <AssetBalance
                        value={row.locked}
                        asset={asset}
                        showSymbol
                        className="border-b border-filter-border text-inherit"
                      />
                      <AssetFiatBalance asset={asset} amount={row.locked} className="text-inherit" />
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
              <StartingBlock
                timelineApi={timelineApi}
                chain={chain}
                status={status}
                startingBlock={row.startingBlock}
              />
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
          width: '170px',
          render: (_, row) =>
            renderCell(row, 'perBlock', ({ row }) =>
              row.perBlock && asset ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <div className="flex flex-col items-end">
                      <AssetBalance
                        value={row.perBlock}
                        asset={asset}
                        showSymbol
                        className="border-b border-filter-border text-inherit"
                      />
                      <AssetFiatBalance asset={asset} amount={row.perBlock} className="text-inherit" />
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
      ];

      if (hasUnlockedAtStartBlock) {
        baseColumns.push({
          key: 'unlockedAtStartBlock',
          title: (
            <div className="flex w-full justify-end gap-x-1">
              <span>{t('vestedTransfer.parsedFile.table.headers.unlockedAtStartBlock')}</span>
              <Tooltip>
                <Tooltip.Trigger>
                  <div>
                    <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('vestedTransfer.parsedFile.table.hints.unlockedAtStartBlock')}</Tooltip.Content>
              </Tooltip>
            </div>
          ),
          width: '140px',
          render: (_, row) =>
            renderCell(row, 'unlockedAtStartBlock', ({ row }) =>
              row.unlockedAtStartBlock && asset ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <div className="flex flex-col items-end">
                      <AssetBalance
                        value={row.unlockedAtStartBlock}
                        asset={asset}
                        showSymbol
                        className="border-b border-filter-border text-inherit"
                      />
                      <AssetFiatBalance asset={asset} amount={row.unlockedAtStartBlock} className="text-inherit" />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {t('vestedTransfer.parsedFile.table.hints.planks', {
                      amount: NUM_FORMATTER.format(BigInt(row.unlockedAtStartBlock)),
                    })}
                  </Tooltip.Content>
                </Tooltip>
              ) : (
                <span className="shrink-0 text-body">{row.unlockedAtStartBlock}</span>
              ),
            ),
        });
      }

      return baseColumns;
    }, [t, chain, asset, getRowIssues, getFieldIssues, timelineApi, vestingSchedule]);

    return (
      <Modal size={hasUnlockedAtStartBlock ? 'xxl' : 'xl'} height="fit">
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
    remainingLockedAmount,
  }: {
    issue: ValidationIssue;
    asset: Asset | null;
    minVestedTransfer?: BN | null;
    remainingLockedAmount?: string | null;
    className?: string;
  }) => {
    const { t } = useI18n();

    const isMinVestedTransferError =
      issue.message === VestingFieldError.MIN_VESTED_TRANSFER && nonNullable(minVestedTransfer) && nonNullable(asset);

    const isCliffMinVestedTransferError =
      issue.message === VestingFieldError.CLIFF_MIN_VESTED_TRANSFER &&
      nonNullable(minVestedTransfer) &&
      nonNullable(asset) &&
      nonNullable(remainingLockedAmount);

    return (
      <div className="flex flex-col">
        <CaptionText className={cnTw('text-right text-inherit', className)}>
          {isMinVestedTransferError ? (
            <MinVestedTransferError minVestedTransfer={minVestedTransfer} asset={asset} />
          ) : isCliffMinVestedTransferError ? (
            <CliffMinVestedTransferError
              minVestedTransfer={minVestedTransfer}
              remainingLockedAmount={remainingLockedAmount}
              asset={asset}
            />
          ) : (
            t(`vestedTransfer.errors.csv.fieldErrors.${issue.message}`)
          )}
        </CaptionText>
      </div>
    );
  },
);

const StartingBlock = memo(
  ({
    timelineApi,
    chain,
    status,
    startingBlock,
  }: {
    timelineApi: ApiPromise | null;
    chain: Chain | null;
    status: RowStatus;
    startingBlock: string;
  }) => {
    const { t } = useI18n();

    const blockNum = Number(startingBlock);
    const startingBlockHeight = blockNum > 0 ? pjsSchema.helpers.toBlockHeight(blockNum) : null;

    const { data: blockTime } = useBlockTimestamp({
      api: timelineApi,
      blockHeight: startingBlockHeight,
      chain,
    });

    let date: string | null = null;
    let time: string | null = null;

    try {
      if (nonNullable(blockTime)) {
        date = format(blockTime, 'dd.MM.yyyy');
        time = format(blockTime, 'H:mm');
      }
    } catch {
      // format failed, leave date/time as null
    }

    const BlockComponent = (
      <span className={cnTw('shrink-0 border-b border-filter-border text-body', STATUS_TEXT_COLORS[status])}>
        {NUM_FORMATTER.format(BigInt(startingBlock))}
      </span>
    );

    if (!date || !time) {
      return BlockComponent;
    }

    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div>{BlockComponent}</div>
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
