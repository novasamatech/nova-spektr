import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useClock } from '@/shared/lib/hooks';
import { formatFiatBalance } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon, Loader } from '@/shared/ui';
import { currencySelect } from '@/aggregates/currency-select';
import { type VestingSummary, vestingPortfolioModel } from '@/aggregates/vesting-portfolio';
import { FiatBalance } from '@/widgets/price';
import { formatUnlockDate } from '../lib/datetime';
import { modalModel } from '../model/modal-model';

export const VestingCallout = () => {
  const { t } = useI18n();

  // Only needed to decide whether the unlock date is near enough to print a
  // clock time for; a minute's resolution is ample.
  const now = useClock(60_000);

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

  // Nothing is drawn until there is something to draw. The row is additive — it
  // sits under a card that carries its own loading state — and most wallets have
  // no vesting at all, so a placeholder here is a row that appears, holds for as
  // long as the slowest chain takes to answer, and then vanishes again, for
  // every user who was never going to see it. `loading` and `empty` are the same
  // absence on screen; the distinction still matters to the model, which is what
  // keeps the row from flashing in on a half-answered question.
  if (status !== 'ready') {
    return null;
  }

  const unlockDate = summary.lastUnlockDate ? formatUnlockDate(summary.lastUnlockDate, now) : null;

  // Prefer the concrete per-day unlock rate ("Unlocking ≈ $2,840/day"); fall back
  // to the generic phrasing while the block time (and thus the rate) isn't known.
  const unlockingPrefix = summary.perDayFiat.gt(0)
    ? t('vesting.callout.unlockingRate', { rate: formatFiat(summary.perDayFiat) })
    : t('vesting.callout.unlockingGradually');
  const subtitle = unlockDate
    ? t('vesting.callout.subtitleWithDate', { prefix: unlockingPrefix, date: unlockDate })
    : unlockingPrefix;

  // The row lands after the card is already on screen — chains answer at their
  // own pace — so it fades in rather than snapping into place.
  return (
    <button
      type="button"
      className="mt-3 flex w-full cursor-pointer items-center gap-x-3 rounded-lg border border-badge-background-hover bg-secondary-button-background px-3 py-2.5 text-left duration-300 animate-in fade-in slide-in-from-top-1"
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
