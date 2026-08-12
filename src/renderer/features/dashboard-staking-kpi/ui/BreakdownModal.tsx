import { useUnit } from 'effector-react';
import { memo, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import { EmptyMessage, Modal, ScrollArea } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { formatAssetAmount } from '../lib/amounts';
import { type BreakdownRow } from '../lib/types';

import { DonutBreakdown } from './DonutBreakdown';
import { Price } from './Price';

/** Only APY opens this breakdown now — nominations have their own table. */
export type BreakdownMode = 'apy';

type Props = {
  rows: BreakdownRow[];
  currency: CurrencyItem | null;
  totalFiat: string;
  /** Headline the donut centre shows while nothing is hovered. */
  headline: string;
  headlineClass?: string;
  walletByAccount: Record<string, Wallet | null>;
  onClose: () => void;
};

/**
 * The APY card's breakdown: one donut over the positions plus a row per
 * position, hover-linked in both directions.
 */
export const BreakdownModal = memo(
  ({ rows, currency, totalFiat, headline, headlineClass, walletByAccount, onClose }: Props) => {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const hovered = hoveredId === null ? null : (rows.find((row) => row.key === hoveredId) ?? null);
    const slices = rows
      .filter((row) => row.value > 0)
      .map((row) => ({ id: row.key, value: row.value, color: row.color }));

    const title = t('dashboard.staking.kpi.apy.detailTitle');

    return (
      <Modal isOpen size="mdlg" onToggle={(open) => !open && onClose()}>
        <Modal.Title close>{title}</Modal.Title>
        <Modal.Content disableScroll>
          {rows.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyMessage
                title={t('dashboard.staking.kpi.empty.title')}
                description={t('dashboard.staking.kpi.empty.description')}
              />
            </div>
          ) : (
            <div className="flex gap-5 px-5 py-4">
              <DonutBreakdown data={slices} hoveredId={hoveredId} onHover={setHoveredId}>
                {hovered ? (
                  <>
                    <SmallTitleText>
                      {/* An unknown APY is not a zero one — the row's own cell
                          says so too, and the donut centre must not disagree. */}
                      {hovered.apy === null
                        ? t('dashboard.staking.kpi.apy.unknown')
                        : t('dashboard.staking.kpi.apy.value', { apy: hovered.apy.toFixed(1) })}
                    </SmallTitleText>
                    <span className="mt-0.5 text-footnote font-medium" style={{ color: hovered.color }}>
                      {hovered.chainName}
                    </span>
                    <HelpText className="mt-0.5 whitespace-nowrap text-text-tertiary">
                      <Price amount={hovered.fiat} currency={currency} />
                    </HelpText>
                  </>
                ) : (
                  <>
                    <SmallTitleText className={headlineClass}>{headline}</SmallTitleText>
                    <HelpText className="mt-0.5 whitespace-nowrap text-text-tertiary">
                      <Price amount={totalFiat} currency={currency} />
                    </HelpText>
                  </>
                )}
              </DonutBreakdown>

              <div className="max-h-80 min-w-0 flex-1">
                <ScrollArea>
                  <div className="flex flex-col gap-1 pe-2">
                    {rows.map((row) => (
                      <div
                        key={row.key}
                        className={cnTw(
                          'flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors',
                          hoveredId === row.key ? 'bg-hover' : 'bg-transparent',
                        )}
                        onMouseEnter={() => setHoveredId(row.key)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <span
                          className="h-6 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <NamedAccount
                            accountId={row.accountId}
                            chain={chains[row.chainId]}
                            wallet={walletByAccount[row.accountId]}
                            titleClass="truncate font-semibold"
                            variant="short"
                            iconSize={20}
                            hideExplorers
                          />
                          <HelpText className="text-text-tertiary">
                            {row.chainName}
                            {}
                            {' · '}
                            {formatAssetAmount({ symbol: row.symbol, precision: row.precision, amount: row.stake })}
                          </HelpText>
                        </div>
                        <div className="shrink-0 text-right">
                          <FootnoteText
                            className={cnTw('tabular-nums', row.earning ? 'text-text-positive' : 'text-text-tertiary')}
                          >
                            {row.apy === null
                              ? t('dashboard.staking.kpi.apy.unknown')
                              : t('dashboard.staking.kpi.apy.value', { apy: row.apy.toFixed(1) })}
                          </FootnoteText>
                          {row.networkAvgRate !== null && (
                            <HelpText className="text-text-tertiary tabular-nums">
                              {t('dashboard.staking.kpi.apy.networkAvg', {
                                rate: Number(row.networkAvgRate.ratePercent).toFixed(1),
                                days: row.networkAvgRate.days,
                              })}
                            </HelpText>
                          )}
                          <HelpText className="text-text-tertiary tabular-nums">
                            <Price amount={row.fiat} currency={currency} />
                          </HelpText>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </Modal.Content>
      </Modal>
    );
  },
);
