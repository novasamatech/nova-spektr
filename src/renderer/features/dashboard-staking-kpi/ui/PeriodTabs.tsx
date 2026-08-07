import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DateRangePicker } from '@/shared/ui-kit';
import { type RewardWindow, REWARD_PERIODS } from '../lib/reward-period';

type Props = {
  value: RewardWindow;
  onChange: (window: RewardWindow) => void;
};

/** The window everything time-bounded on the rewards screen is read through. */
export const PeriodTabs = ({ value, onChange }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 items-center gap-x-2">
      <div className="flex w-fit items-center gap-x-1 rounded-md bg-tab-background p-0.5">
        {REWARD_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            className={cnTw(
              'cursor-pointer rounded-sm px-3 py-1 text-button-small transition-all duration-100',
              value.period === period
                ? 'bg-white text-text-primary shadow-card-shadow'
                : 'text-text-secondary hover:text-text-primary',
            )}
            onClick={() => onChange({ period, range: period === 'custom' ? value.range : null })}
          >
            {t(`dashboard.staking.kpi.rewards.period.${period}`)}
          </button>
        ))}
      </div>

      {/*
        The picker appears only under the Custom tab: a date field sitting next
        to "30d" invites the user to set both and wonder which one won.
      */}
      {value.period === 'custom' && (
        <div className="w-[160px]">
          <DateRangePicker
            value={value.range ?? undefined}
            placeholder={t('dashboard.staking.kpi.rewards.period.pickDates')}
            onChange={(range) => onChange({ period: 'custom', range: range ?? null })}
          />
        </div>
      )}
    </div>
  );
};
