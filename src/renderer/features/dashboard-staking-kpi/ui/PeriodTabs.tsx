import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type RewardPeriod, REWARD_PERIODS } from '../lib/reward-period';

type Props = {
  value: RewardPeriod;
  onChange: (period: RewardPeriod) => void;
};

/** The window everything time-bounded on the rewards screen is read through. */
export const PeriodTabs = ({ value, onChange }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex w-fit shrink-0 items-center gap-x-1 rounded-md bg-tab-background p-0.5">
      {REWARD_PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          className={cnTw(
            'cursor-pointer rounded-sm px-3 py-1 text-button-small transition-all duration-100',
            value === period
              ? 'bg-white text-text-primary shadow-card-shadow'
              : 'text-text-secondary hover:text-text-primary',
          )}
          onClick={() => onChange(period)}
        >
          {t(`dashboard.staking.kpi.rewards.period.${period}`)}
        </button>
      ))}
    </div>
  );
};
