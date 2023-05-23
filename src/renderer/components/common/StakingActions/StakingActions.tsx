import { useState } from 'react';
import cn from 'classnames';
import { Trans } from 'react-i18next';

import { BaseModal, Button, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Stake } from '@renderer/domain/stake';
import Paths, { PathValue } from '@renderer/routes/paths';
import { useToggle } from '@renderer/shared/hooks';
import { toAccountId } from '@renderer/shared/utils/address';
import { Address } from '@renderer/domain/shared-kernel';

const enum AccountTypes {
  STASH = 'stash',
  CONTROLLER = 'controller',
}

const STAKE_ACTIONS = {
  startStaking: { icon: 'startStaking', title: 'staking.actions.startStakingLabel', path: Paths.BOND },
  stakeMore: { icon: 'stakeMore', title: 'staking.actions.stakeMoreLabel', path: Paths.STAKE_MORE },
  unstake: { icon: 'unstake', title: 'staking.actions.unstakeLabel', path: Paths.UNSTAKE },
  returnToStake: { icon: 'returnToStake', title: 'staking.actions.returnToStakeLabel', path: Paths.RESTAKE },
  redeem: { icon: 'redeem', title: 'staking.actions.redeemLabel', path: Paths.REDEEM },
  setValidators: { icon: 'setValidators', title: 'staking.actions.setValidatorsLabel', path: Paths.VALIDATORS },
  destination: { icon: 'destination', title: 'staking.actions.destinationLabel', path: Paths.DESTINATION },
} as const;

type StakeAction = keyof typeof STAKE_ACTIONS;

const StashActions: Array<StakeAction> = ['stakeMore'];
const ControllerActions: Array<StakeAction> = [
  'startStaking',
  'unstake',
  'returnToStake',
  'redeem',
  'setValidators',
  'destination',
];

type Props = {
  stakes: Stake[];
  selectedAccounts?: string[];
  className?: string;
  onNavigate: (path: PathValue, accounts?: Address[]) => void;
};

const StakingActions = ({ stakes, className, onNavigate }: Props) => {
  const { t } = useI18n();

  const [isDialogOpen, toggleIsDialogOpen] = useToggle();
  const [actionType, setActionType] = useState<StakeAction | null>(null);
  const [warningMessage, setWarningMessage] = useState<string>('');

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

  const isController = (stake: Stake): boolean => {
    return !stake.controller || toAccountId(stake.address) === toAccountId(stake.controller);
  };

  const isStash = (stake: Stake): boolean => {
    return !stake.stash || toAccountId(stake.address) === toAccountId(stake.stash);
  };

  const hasIncorrectAccounts = (action: StakeAction): AccountTypes | null => {
    if (StashActions.includes(action)) return stakes.every(isStash) ? null : AccountTypes.STASH;
    if (ControllerActions.includes(action)) return stakes.every(isController) ? null : AccountTypes.CONTROLLER;

    return null;
  };

  const getAccounts = (accountType: AccountTypes): Stake[] => {
    if (accountType === AccountTypes.STASH) return stakes.filter(isStash);
    if (accountType === AccountTypes.CONTROLLER) return stakes.filter(isController);

    return stakes;
  };

  const onClickAction = (action: StakeAction) => {
    const { path } = STAKE_ACTIONS[action];
    const accountType = hasIncorrectAccounts(action);

    if (accountType) {
      setActionType(action);
      setWarningMessage(t(accountType === AccountTypes.STASH ? 'staking.warning.stash' : 'staking.warning.controller'));

      toggleIsDialogOpen();
    } else {
      onNavigate(path);
    }
  };

  const onDeselectIncorrectAccounts = (action: StakeAction | null) => {
    if (!action) return;
    toggleIsDialogOpen();

    const accountType = hasIncorrectAccounts(actionType!);

    if (accountType) {
      const accounts = getAccounts(accountType);

      onNavigate(
        STAKE_ACTIONS[action].path,
        accounts.map((account) => account.address),
      );
    } else {
      onNavigate(STAKE_ACTIONS[action].path);
    }
  };

  return (
    <div className={cn('shadow-surface bg-white rounded-2lg border-2 border-shade-10', className)}>
      <ul className="flex gap-x-1 p-2.5">
        {Object.entries(actionsSummary).map(([key, value]) => {
          if (stakes.length !== value) return null;
          const { icon, title } = STAKE_ACTIONS[key as StakeAction];

          return (
            <li key={key} className="font-semibold text-sm text-primary w-[105px]">
              <button
                className={cn(
                  'flex flex-col justify-between items-center rounded-2lg h-full w-full p-1 transition',
                  'hover:bg-shade-10 focus:bg-shade-10',
                )}
                type="button"
                onClick={() => onClickAction(key as StakeAction)}
              >
                <Icon name={icon} size={30} />
                {t(title)}
              </button>
            </li>
          );
        })}
      </ul>

      <BaseModal
        contentClass="px-5 py-5 w-[490px]"
        isOpen={isDialogOpen}
        title={
          <div className="flex items-center gap-2.5">
            {actionType && (
              <>
                <Icon name={STAKE_ACTIONS[actionType].icon} />
                <p>{t(STAKE_ACTIONS[actionType].title)}</p>
              </>
            )}
          </div>
        }
        onClose={toggleIsDialogOpen}
      >
        <p className="text-neutral-variant">
          <Trans t={t} i18nKey={warningMessage} />
        </p>

        <div className="flex items-center gap-2.5 mt-5">
          <Button
            className="flex-1"
            variant="fill"
            pallet="primary"
            weight="lg"
            onClick={() => onDeselectIncorrectAccounts(actionType)}
          >
            {t('staking.warning.yesButton')}
          </Button>

          <Button className="flex-1" variant="outline" pallet="primary" weight="lg" onClick={toggleIsDialogOpen}>
            {t('staking.warning.noButton')}
          </Button>
        </div>
      </BaseModal>
    </div>
  );
};

export default StakingActions;
