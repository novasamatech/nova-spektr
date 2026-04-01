import { memo, useMemo } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { Identicon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { type AccountUnlockRow } from '../hooks/useUnlockSchedule';

import { ChartTooltip } from './ChartTooltip';
import { Price } from './Price';
import { buildChartData } from './buildChartData';

type Props = {
  title: string;
  totalFiat: string;
  rows: AccountUnlockRow[];
  allEntries: { accountId: string; name: string; address: string }[];
  currency: CurrencyItem | null;
  onClose: () => void;
};

type TableRow = AccountUnlockRow & {
  name: string;
  address: string;
  colorIndex: number;
  sharePercent: number;
};

export const UnlockBreakdownModal = memo(({ title, totalFiat, rows, allEntries, currency, onClose }: Props) => {
  const { t } = useI18n();

  const entryMap = useMemo(() => {
    const map = new Map<string, { name: string; address: string }>();
    for (const entry of allEntries) {
      map.set(entry.accountId, { name: entry.name, address: entry.address });
    }

    return map;
  }, [allEntries]);

  const tableRows: TableRow[] = useMemo(() => {
    const totalFiatNum = rows.reduce((sum, r) => sum + r.fiatValueNum, 0);

    return rows.map((row, i) => {
      const entry = entryMap.get(row.accountId);

      return {
        ...row,
        name: entry?.name ?? toShortAddress(row.accountId),
        address: entry?.address ?? row.accountId,
        colorIndex: i,
        sharePercent: totalFiatNum > 0 ? (row.fiatValueNum / totalFiatNum) * 100 : 0,
      };
    });
  }, [rows, entryMap]);

  const chartData = useMemo(
    () =>
      buildChartData(
        tableRows,
        (r) => r.name,
        (r) => r.fiatValueNum,
      ),
    [tableRows],
  );

  const columns: Column<TableRow>[] = useMemo(
    () => [
      {
        key: 'name',
        title: t('dashboard.unlockSchedule.breakdown.account'),
        width: '35%',
        render: (_, item) => (
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: FALLBACK_COLORS[item.colorIndex % FALLBACK_COLORS.length] }}
            />
            <Identicon address={toAddress(item.address)} />
            <div className="min-w-0">
              <FootnoteText className="truncate font-semibold">{item.name}</FootnoteText>
              <FootnoteText className="text-text-tertiary">{toShortAddress(item.address)}</FootnoteText>
            </div>
          </div>
        ),
      },
      {
        key: 'fiatValueNum',
        title: t('dashboard.unlockSchedule.breakdown.amount'),
        sortable: true,
        width: '25%',
        render: (_, item) => {
          const bal = formatBalance(item.amount, item.precision);

          return (
            <div className="flex flex-col">
              <FootnoteText className="tabular-nums">
                {bal.formatted}
                {bal.suffix ? ` ${bal.suffix}` : ''} {item.symbol}
              </FootnoteText>
              <FootnoteText className="text-text-tertiary tabular-nums">
                <Price amount={item.amountFiat} currency={currency} />
              </FootnoteText>
            </div>
          );
        },
      },
      {
        key: 'chainName',
        title: t('dashboard.unlockSchedule.breakdown.chain'),
        width: '22%',
        render: (_, item) => (
          <div className="flex items-center gap-2">
            <img src={item.chainIcon} alt={item.chainName} className="h-5 w-5" />
            <FootnoteText>{item.chainName}</FootnoteText>
          </div>
        ),
      },
      {
        key: 'sharePercent',
        title: t('dashboard.unlockSchedule.breakdown.share'),
        sortable: true,
        width: '18%',
        render: (_, item) => (
          <FootnoteText className="tabular-nums">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {item.sharePercent.toFixed(1)}%
          </FootnoteText>
        ),
      },
    ],
    [t, currency],
  );

  const showChart = chartData.length > 0;

  return (
    <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex items-center justify-between px-5 py-3">
          <FootnoteText className="font-bold">
            {t('dashboard.unlockSchedule.breakdown.accountCount', { count: tableRows.length })}
          </FootnoteText>
          <FootnoteText className="font-bold tabular-nums">
            <Price amount={totalFiat} currency={currency} />
          </FootnoteText>
        </div>

        <div className="border-t border-divider" />

        {showChart && (
          <div className="flex justify-center px-5 py-3">
            <PieChart width={180} height={180}>
              <Pie
                data={chartData}
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              />
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </div>
        )}

        <div className="overflow-y-auto px-5 pb-4" style={{ maxHeight: 440 }}>
          <Table columns={columns} data={tableRows} />
        </div>
      </Modal.Content>
    </Modal>
  );
});
