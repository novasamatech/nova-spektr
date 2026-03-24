import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toShortAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { DashboardWidget } from '@/pages/Dashboard';
import { type UnlockEvent, useUnlockSchedule } from '../hooks/useUnlockSchedule';

import { Price } from './Price';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

export const UnlockScheduleWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();

  const accountNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of allEntries) {
      map.set(entry.accountId, entry.name);
    }

    return map;
  }, [allEntries]);
  const { claimableNowFiat, pendingLocksFiat, delegatedFiat, events, pending, fiatFlag, currency } =
    useUnlockSchedule(accountIds);

  if (!fiatFlag) return null;

  if (accountIds.length === 0) {
    return (
      <DashboardWidget colSpan={2}>
        <FootnoteText className="text-text-tertiary">{t('dashboard.unlockSchedule.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  const hasData = events.length > 0 || claimableNowFiat !== '0' || delegatedFiat !== '0';

  return (
    <DashboardWidget colSpan={2}>
      <FootnoteText className="text-text-tertiary">{t('dashboard.unlockSchedule.title')}</FootnoteText>

      {hasData && !pending && (
        <>
          <div className="my-4 border-t border-divider" />
          <div className="flex gap-4">
            <SummaryItem
              label={t('dashboard.unlockSchedule.claimableNow')}
              amount={claimableNowFiat}
              currency={currency}
              colorClass="text-text-positive"
            />
            <SummaryItem
              label={t('dashboard.unlockSchedule.pendingLocks')}
              amount={pendingLocksFiat}
              currency={currency}
              colorClass="text-text-secondary"
            />
            <SummaryItem
              label={t('dashboard.unlockSchedule.delegated')}
              amount={delegatedFiat}
              currency={currency}
              colorClass="text-text-tertiary"
            />
          </div>
        </>
      )}

      {hasData && events.length > 0 && !pending && (
        <>
          <div className="my-4 border-t border-divider" />
          <FootnoteText className="mb-2 text-text-tertiary">
            {t('dashboard.unlockSchedule.upcomingUnlocks')}
          </FootnoteText>
          <div className="flex max-h-[200px] flex-col gap-2 overflow-y-auto">
            {events.map((event, i) => (
              <UnlockEventRow key={i} event={event} currency={currency} accountNameMap={accountNameMap} />
            ))}
          </div>
        </>
      )}

      {!pending && !hasData && (
        <div className="flex flex-col items-center gap-y-1 py-6">
          <BodyText className="text-text-tertiary">{t('dashboard.unlockSchedule.noLocks')}</BodyText>
        </div>
      )}

      {pending && !hasData && (
        <div className="my-4 flex flex-col gap-3">
          <Skeleton width="100%" height={10} />
          <Skeleton width="100%" height={10} />
        </div>
      )}
    </DashboardWidget>
  );
};

type SummaryItemProps = {
  label: string;
  amount: string | null;
  currency: ReturnType<typeof useUnlockSchedule>['currency'];
  colorClass: string;
};

const SummaryItem = memo(({ label, amount, currency, colorClass }: SummaryItemProps) => (
  <div className="flex flex-1 flex-col items-center gap-1">
    <FootnoteText className={colorClass}>{label}</FootnoteText>
    <FootnoteText className="text-text-primary">
      <Price amount={amount ?? '0'} currency={currency} />
    </FootnoteText>
  </div>
));

type UnlockEventRowProps = {
  event: UnlockEvent;
  currency: ReturnType<typeof useUnlockSchedule>['currency'];
  accountNameMap: Map<string, string>;
};

const UnlockEventRow = memo(({ event, currency, accountNameMap }: UnlockEventRowProps) => {
  const { t } = useI18n();
  const { formatted, suffix } = formatBalance(event.amount, event.precision);

  const accountLabel =
    event.accountIds.length <= 2
      ? event.accountIds.map((id) => accountNameMap.get(id) ?? toShortAddress(id)).join(', ')
      : t('dashboard.unlockSchedule.accountCount', { count: event.accountIds.length });

  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1">
      <div className="flex items-center gap-2">
        <img src={event.chainIcon} alt={event.chainName} className="h-5 w-5" />
        <div className="flex flex-col">
          <FootnoteText className="text-text-tertiary">{formatRelativeDate(event.unlockAtMs)}</FootnoteText>
          <FootnoteText className="text-help-text text-text-tertiary">{accountLabel}</FootnoteText>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <FootnoteText className="text-text-primary">
          {formatted}
          {suffix ? ` ${suffix}` : ''} {event.symbol}
        </FootnoteText>
        <FootnoteText className="text-help-text text-text-tertiary">
          <Price amount={event.amountFiat} currency={currency} />
        </FootnoteText>
      </div>
    </div>
  );
});

function formatRelativeDate(timestampMs: number): string {
  const now = Date.now();
  const diffMs = timestampMs - now;

  if (diffMs <= 0) {
    return 'now';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);

  if (hours < 24) {
    return `in ${hours}h`;
  }

  if (days < 7) {
    return `in ${days}d`;
  }

  if (weeks <= 8) {
    return `in ${weeks}w`;
  }

  const date = new Date(timestampMs);
  const month = date.toLocaleString('en', { month: 'short' });
  const year = date.getFullYear();
  const currentYear = new Date(now).getFullYear();

  if (year === currentYear) {
    return `~${month} ${date.getDate()}`;
  }

  return `~${month} ${date.getDate()}, ${year}`;
}
