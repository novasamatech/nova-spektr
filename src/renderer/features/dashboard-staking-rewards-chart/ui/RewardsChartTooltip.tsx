import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HelpText } from '@/shared/ui';
import { AssetBalance, ChainIcon } from '@/shared/ui-entities';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { TOOLTIP_WIDTH } from '../lib/constants';
import { type DateFormatter, formatBucketDate } from '../lib/labels';
import { type RewardBucket } from '../lib/types';

type Props = {
  bucket: RewardBucket;
  chain: Chain;
  asset: Asset;
  color: string;
  /** `null` when no era can be named honestly for this bucket. */
  era: number | null;
  walletByAccountId: Map<AccountId, Wallet>;
  formatDate: DateFormatter;
};

export const RewardsChartTooltip = ({ bucket, chain, asset, color, era, walletByAccountId, formatDate }: Props) => {
  const { t } = useI18n();

  const date = formatBucketDate(bucket, formatDate);

  const title = (() => {
    switch (bucket.granularity) {
      case 'week':
        return t('dashboard.staking.rewardsChart.tooltip.week', { date });
      case 'month':
        return date;
      case 'day':
        return era === null
          ? date
          : t('dashboard.staking.rewardsChart.tooltip.dayWithEra', { date, era: era.toLocaleString() });
    }
  })();

  return (
    // Bounded by the plot (the parent caps the height), so the card is a column
    // where only the account list gives way — the title and the total, which
    // carry the count and the sum, always stay readable.
    <div
      data-testid="rewards-tooltip"
      className="pointer-events-none flex min-h-0 flex-col rounded-lg border border-token-container-border bg-white p-3 shadow-card-shadow"
      style={{ width: TOOLTIP_WIDTH }}
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <HelpText className="text-text-tertiary">{title}</HelpText>
        {bucket.accounts.length > 1 ? (
          <HelpText className="text-text-tertiary">
            {t('dashboard.staking.rewardsChart.tooltip.accountCount', { count: bucket.accounts.length })}
          </HelpText>
        ) : null}
      </div>

      {bucket.accounts.length > 0 ? (
        <div className="mt-2 flex min-h-0 flex-col gap-1.5 overflow-hidden">
          {bucket.accounts.map((entry) => {
            const accountId = toAccountId(entry.accountId);

            return (
              <div key={entry.accountId} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <NamedAccount
                    accountId={accountId}
                    chain={chain}
                    wallet={walletByAccountId.get(accountId) ?? null}
                    variant="short"
                    iconSize={16}
                    hideAddress
                    hideExplorers
                  />
                </div>
                <ChainIcon chain={chain} size={14} />
                <AssetBalance value={entry.amount} asset={asset} className="text-footnote" />
              </div>
            );
          })}
        </div>
      ) : (
        <FootnoteText className="mt-2 text-text-tertiary">
          {t('dashboard.staking.rewardsChart.tooltip.noRewards')}
        </FootnoteText>
      )}

      <div className="mt-2 flex shrink-0 items-center gap-2 border-t border-token-container-border pt-2">
        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
        <FootnoteText className="flex-1 text-text-secondary">
          {t('dashboard.staking.rewardsChart.tooltip.total')}
        </FootnoteText>
        <AssetBalance value={bucket.total} asset={asset} className="text-footnote font-semibold" />
        <AssetFiatBalance asset={asset} amount={bucket.total} />
      </div>
    </div>
  );
};
