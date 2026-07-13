import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { formatFiatBalance } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon, Loader } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { currencySelect } from '@/aggregates/currency-select';
import { type VestingSummary, vestingPortfolioModel } from '@/aggregates/vesting-portfolio';
import { FiatBalance } from '@/widgets/price';
import { modalModel } from '../model/modal-model';

export const VestingCallout = () => {
  const { t } = useI18n();

  const currency = useUnit(currencySelect.$activeCurrency);
  const status = useUnit(vestingPortfolioModel.$status);
  const summary = useUnit(vestingPortfolioModel.$summary);
  const loadingMore = useUnit(vestingPortfolioModel.$loadingMore);

  // Fiat amount as a display string (grouped, with the active currency's symbol
  // or code) — matches how the rest of the app prints fiat.
  const formatFiat = (value: VestingSummary['perDayFiat']) => {
    const amount = formatFiatBalance(value.toString(), 0).formatted;

    return currency?.symbol
      ? t('price.withSymbol', { symbol: currency.symbol, amount })
      : t('price.withCode', { code: currency?.code ?? '', amount });
  };

  // Not every chain that could hold vesting has reported yet, so nothing may be
  // said about the absence of it — hold the skeleton rather than claim an empty
  // wallet we would have to take back a second later.
  if (status === 'loading') {
    return (
      <div className="mt-3 flex w-full items-center gap-x-3 rounded-lg border border-divider px-3 py-2.5">
        <Skeleton width="32px" height="32px" />
        <div className="flex flex-1 flex-col gap-y-1.5">
          <Skeleton width="180px" height="12px" />
          <Skeleton width="120px" height="10px" />
        </div>
        <Skeleton width="72px" height="20px" />
      </div>
    );
  }

  // Every chain reported, and none of them holds vesting for these accounts.
  if (status === 'empty') {
    return (
      <div className="mt-3 flex w-full items-center gap-x-3 rounded-lg border border-divider px-3 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-block-background-hover">
          <Icon name="clock" size={16} className="text-text-tertiary" />
        </span>
        <FootnoteText className="text-text-tertiary">{t('vesting.callout.empty')}</FootnoteText>
      </div>
    );
  }

  const unlockDate = summary.lastUnlockDate
    ? summary.lastUnlockDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  // Prefer the concrete per-day unlock rate ("Unlocking ≈ $2,840/day"); fall back
  // to the generic phrasing while the block time (and thus the rate) isn't known.
  const unlockingPrefix = summary.perDayFiat.gt(0)
    ? t('vesting.callout.unlockingRate', { rate: formatFiat(summary.perDayFiat) })
    : t('vesting.callout.unlockingGradually');
  const subtitle = unlockDate
    ? t('vesting.callout.subtitleWithDate', { prefix: unlockingPrefix, date: unlockDate })
    : unlockingPrefix;

  return (
    <button
      type="button"
      className="mt-3 flex w-full cursor-pointer items-center gap-x-3 rounded-lg border border-badge-background-hover bg-secondary-button-background px-3 py-2.5 text-left"
      onClick={() => modalModel.scheduleModalOpened()}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-background">
        <Icon name="clock" size={16} className="text-icon-accent" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <FootnoteText className="font-semibold">
          {t('vesting.callout.activeSchedules', { count: summary.schedulesCount })}
        </FootnoteText>
        <HelpText className="text-text-tertiary">{subtitle}</HelpText>
      </span>
      {summary.hasClaim && (
        <span className="flex items-center gap-x-1 rounded-lg bg-badge-background px-2 py-1 whitespace-nowrap">
          <FiatBalance
            amount={formatFiatBalance(summary.claimableFiat.toString(), 0).formatted}
            className="text-help-text font-bold text-icon-accent"
          />
          <HelpText className="font-bold text-icon-accent">{t('vesting.callout.ready')}</HelpText>
        </span>
      )}
      {/* Some chains/accounts are still being fetched — the count and amounts may grow. */}
      {loadingMore && <Loader color="primary" size={16} />}
      <span className="flex items-center gap-x-1 whitespace-nowrap text-icon-accent">
        <HelpText className="font-bold text-icon-accent">{t('vesting.callout.schedule')}</HelpText>
        <Icon name="right" size={10} className="text-icon-accent" />
      </span>
    </button>
  );
};
