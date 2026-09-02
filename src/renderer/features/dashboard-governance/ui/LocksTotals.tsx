import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { type CurrencyItem } from '@/domains/price';
import { type LockTotals } from '../lib/sumLockTotals';

import { Price } from './Price';

type Props = {
  totals: LockTotals;
  currency: CurrencyItem | null;
};

type ItemProps = {
  label: string;
  amount: string;
  currency: CurrencyItem | null;
  colorClass: string;
};

const Item = memo(({ label, amount, currency, colorClass }: ItemProps) => (
  <div className="flex flex-1 flex-col items-center gap-1 py-2">
    <FootnoteText className={colorClass}>{label}</FootnoteText>
    <FootnoteText className="text-text-primary tabular-nums">
      <Price amount={amount} currency={currency} />
    </FootnoteText>
  </div>
));

/**
 * Claimable / Pending / Delegated over every row the table holds, in fiat — the
 * one line the old Unlock Schedule widget had that the table did not.
 */
export const LocksTotals = memo(({ totals, currency }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-4 border-b border-divider pb-2">
      <Item
        label={t('dashboard.unlockSchedule.claimableNow')}
        amount={totals.claimable}
        currency={currency}
        colorClass="text-text-positive"
      />
      <Item
        label={t('dashboard.unlockSchedule.pendingLocks')}
        amount={totals.pending}
        currency={currency}
        colorClass="text-text-secondary"
      />
      <Item
        label={t('dashboard.unlockSchedule.delegated')}
        amount={totals.delegated}
        currency={currency}
        colorClass="text-text-tertiary"
      />
    </div>
  );
});
