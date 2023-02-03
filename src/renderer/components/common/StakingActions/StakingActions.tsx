import cn from 'classnames';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Stake } from '@renderer/domain/stake';
import Paths from '@renderer/routes/paths';

const STAKE_ACTIONS = {
  startStaking: { icon: 'startStaking', title: 'staking.actions.startStakingLabel', path: Paths.STAKING },
  stakeMore: { icon: 'startStaking', title: 'staking.actions.stakeMoreLabel', path: Paths.STAKING },
  unstake: { icon: 'stakeMore', title: 'staking.actions.unstakeLabel', path: Paths.STAKING },
  returnToStake: { icon: 'unstake', title: 'staking.actions.returnToStakeLabel', path: Paths.STAKING },
  redeem: { icon: 'returnToStake', title: 'staking.actions.redeemLabel', path: Paths.STAKING },
  setValidators: { icon: 'redeem', title: 'staking.actions.setValidatorsLabel', path: Paths.STAKING },
  destination: { icon: 'destination', title: 'staking.actions.destinationLabel', path: Paths.STAKING },
} as const;

type StakeAction = keyof typeof STAKE_ACTIONS;

type Props = {
  stakes: Stake[];
  className?: string;
  onNavigate: (path: string) => void;
};

const StakingActions = ({ stakes, className, onNavigate }: Props) => {
  const { t } = useI18n();

  const actionsSummary = stakes.reduce<Record<StakeAction, number>>(
    (acc, stake) => {
      acc.startStaking += stake.total ? 0 : 1;
      acc.stakeMore += stake.total ? 1 : 0;
      acc.unstake += stake.total ? 1 : 0;
      acc.setValidators += stake.total ? 1 : 0;
      acc.destination += stake.total ? 1 : 0;
      acc.returnToStake += stake.unlocking?.length > 0 ? 1 : 0;
      acc.redeem += stake.total !== stake.active ? 1 : 0;

      return acc;
    },
    {
      startStaking: 0,
      stakeMore: 0,
      unstake: 0,
      returnToStake: 0,
      redeem: 0,
      setValidators: 0,
      destination: 0,
    },
  );

  const noStakes = stakes.length === 0;

  const otherActionsSum = Object.values(actionsSummary)
    .slice(1)
    .reduce((acc, value) => acc + value, 0);
  const wrongOverlaps = actionsSummary.startStaking > 0 && otherActionsSum > 0;

  if (noStakes || wrongOverlaps) {
    return null;
  }

  return (
    <div className={cn('shadow-surface bg-white rounded-2lg border-2 border-shade-10', className)}>
      <ul className="flex gap-x-1 p-2.5">
        {Object.entries(actionsSummary).map(([key, value]) => {
          if (stakes.length !== value) return null;
          const { icon, title, path } = STAKE_ACTIONS[key as StakeAction];

          return (
            <li key={key} className="font-semibold text-sm text-primary w-[105px]">
              <button
                className={cn(
                  'flex flex-col justify-between items-center rounded-2lg h-full w-full p-1 transition',
                  'hover:bg-shade-10 focus:bg-shade-10',
                )}
                type="button"
                onClick={() => onNavigate(path)}
              >
                <Icon name={icon} size={30} />
                {t(title)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default StakingActions;
