import { useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import { SmallTitleText, DropdownButton, Button, BaseModal, Icon } from '@shared/ui';
import { toAccountId } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';
import { ButtonDropdownOption } from '@shared/ui/types';
import { IconNames } from '@shared/ui/Icon/data';
import { Paths, type PathType } from '@shared/routes';
import type { Address, Stake } from '@shared/core';

const enum AccountTypes {
  STASH = 'stash',
  CONTROLLER = 'controller',
}

const enum StakeActions {
  START_STAKING = 'startStaking',
  STAKE_MORE = 'stakeMore',
  UNSTAKE = 'unstake',
  RETURN_TO_STAKE = 'returnToStake',
  REDEEM = 'redeem',
  CHANGE_VALIDATORS = 'changeValidators',
  DESTINATION = 'destination',
}

const StashActions: StakeActions[] = [StakeActions.STAKE_MORE];
const ControllerActions: StakeActions[] = [
  StakeActions.START_STAKING,
  StakeActions.UNSTAKE,
  StakeActions.RETURN_TO_STAKE,
  StakeActions.REDEEM,
  StakeActions.CHANGE_VALIDATORS,
  StakeActions.DESTINATION,
];

const OperationOptions: Record<StakeActions, { icon: IconNames; title: string; path: PathType }> = {
  [StakeActions.START_STAKING]: { icon: 'startStaking', title: 'staking.actions.startStakingLabel', path: Paths.BOND },
  [StakeActions.STAKE_MORE]: { icon: 'stakeMore', title: 'staking.actions.stakeMoreLabel', path: Paths.STAKE_MORE },
  [StakeActions.UNSTAKE]: { icon: 'unstake', title: 'staking.actions.unstakeLabel', path: Paths.UNSTAKE },
  [StakeActions.RETURN_TO_STAKE]: {
    icon: 'returnToStake',
    title: 'staking.actions.returnToStakeLabel',
    path: Paths.RESTAKE,
  },
  [StakeActions.REDEEM]: { icon: 'redeem', title: 'staking.actions.redeemLabel', path: Paths.REDEEM },
  [StakeActions.CHANGE_VALIDATORS]: {
    icon: 'changeValidators',
    title: 'staking.actions.changeValidatorsLabel',
    path: Paths.VALIDATORS,
  },
  [StakeActions.DESTINATION]: {
    icon: 'destination',
    title: 'staking.actions.destinationLabel',
    path: Paths.DESTINATION,
  },
};

type Props = {
  canInteract: boolean;
  stakes: Stake[];
  isStakingLoading: boolean;
  onNavigate: (path: PathType, addresses?: Address[]) => void;
};

export const Actions = ({ canInteract, stakes, isStakingLoading, onNavigate }: Props) => {
  const { t } = useI18n();
  const [isDialogOpen, toggleIsDialogOpen] = useToggle();

  const [actionType, setActionType] = useState<StakeActions | null>(null);
  const [actionPath, setActionPath] = useState<PathType>();
  const [warningMessage, setWarningMessage] = useState('');

  if (!canInteract) {
    return (
      <div className="flex justify-between items-center">
        <SmallTitleText className="leading-[42px]">{t('staking.overview.actionsTitle')}</SmallTitleText>
      </div>
    );
  }

  const actionsSummary = stakes.reduce<Record<StakeActions, number>>(
    (acc, stake) => {
      acc.startStaking += stake.total ? 0 : 1;
      acc.stakeMore += stake.total ? 1 : 0;
      acc.unstake += stake.total ? 1 : 0;
      acc.changeValidators += stake.total ? 1 : 0;
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
      changeValidators: 0,
      destination: 0,
    },
  );

  const otherActionsSum = Object.values(actionsSummary)
    .slice(1)
    .reduce((acc, value) => acc + value, 0);

  const noStakes = stakes.length === 0;
  const wrongOverlaps = actionsSummary.startStaking > 0 && otherActionsSum > 0;

  const isController = (stake: Stake): boolean => {
    return !stake.controller || toAccountId(stake.address) === toAccountId(stake.controller);
  };

  const isStash = (stake: Stake): boolean => {
    return !stake.stash || toAccountId(stake.address) === toAccountId(stake.stash);
  };

  const getIncorrectAccountType = (action: StakeActions): AccountTypes | null => {
    if (StashActions.includes(action)) {
      return stakes.every(isStash) ? null : AccountTypes.STASH;
    }
    if (ControllerActions.includes(action)) {
      return stakes.every(isController) ? null : AccountTypes.CONTROLLER;
    }

    return null;
  };

  const getStakeAddresses = (accountType: AccountTypes): Address[] => {
    let filterFn: (value?: any) => boolean = () => true;
    if (accountType === AccountTypes.STASH) filterFn = isStash;
    if (accountType === AccountTypes.CONTROLLER) filterFn = isController;

    return stakes.filter(filterFn).map((s) => s.address);
  };

  const onClickAction = (action: StakeActions, path: PathType) => {
    const incorrectType = getIncorrectAccountType(action);

    if (incorrectType) {
      setActionType(action);
      setActionPath(path);
      setWarningMessage(
        t(incorrectType === AccountTypes.STASH ? 'staking.warning.stash' : 'staking.warning.controller'),
      );

      toggleIsDialogOpen();
    } else {
      onNavigate(path);
    }
  };

  const onDeselectAccounts = () => {
    if (!actionType || !actionPath) return;

    toggleIsDialogOpen();

    const incorrectType = getIncorrectAccountType(actionType);

    if (incorrectType) {
      onNavigate(actionPath, getStakeAddresses(incorrectType));
    } else {
      onNavigate(actionPath);
    }
  };

  const getAvailableButtonOptions = (): ButtonDropdownOption[] => {
    if (noStakes || wrongOverlaps) return [];

    return Object.entries(actionsSummary).reduce<ButtonDropdownOption[]>((acc, [key, value]) => {
      if (stakes.length === value) {
        const typedKey = key as StakeActions;
        const option = OperationOptions[typedKey];

        acc.push({
          id: key,
          icon: option.icon,
          //eslint-disable-next-line i18next/no-literal-string
          title: t(`staking.actions.${option.icon}Label`),
          onClick: () => onClickAction(typedKey, option.path),
        });
      }

      return acc;
    }, []);
  };

  const getActionButtonText = (): string => {
    if (noStakes) return t('staking.actions.selectAccPlaceholder');
    if (wrongOverlaps) return t('staking.actions.noOverlapPlaceholder');

    return t('staking.actions.manageStakePlaceholder');
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <SmallTitleText>{t('staking.overview.actionsTitle')}</SmallTitleText>
        {/* TODO: implement filters in future */}
        {/*<MultiSelect*/}
        {/*  className="w-[200px] ml-4 mr-auto"*/}
        {/*  placeholder={t('staking.actions.filterButton')}*/}
        {/*  options={}*/}
        {/*  selectedIds={activeFilters.map((f) => f.id)}*/}
        {/*  onChange={setActiveFilters}*/}
        {/*/>*/}
        <DropdownButton
          className="min-w-[228px] h-8.5"
          title={getActionButtonText()}
          disabled={isStakingLoading || noStakes || wrongOverlaps}
          options={getAvailableButtonOptions()}
        />
      </div>

      <BaseModal
        isOpen={isDialogOpen}
        title={
          <div className="flex items-center gap-2.5">
            {actionType && (
              <>
                <Icon name={OperationOptions[actionType].icon} />
                <p>{t(OperationOptions[actionType].title)}</p>
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
          <Button className="flex-1" variant="text" onClick={toggleIsDialogOpen}>
            {t('staking.warning.noButton')}
          </Button>

          <Button className="flex-1" onClick={onDeselectAccounts}>
            {t('staking.warning.yesButton')}
          </Button>
        </div>
      </BaseModal>
    </>
  );
};
