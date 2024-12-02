import { useState } from 'react';
import { Trans } from 'react-i18next';

import { type Address, type Stake } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { toAccountId } from '@/shared/lib/utils';
import { BaseModal, Button, Icon, SmallTitleText } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';
import { ControllerOperations, OperationOptions, StashOperations } from '../lib/constants';
import { ControllerTypes, type Operations } from '../lib/types';

type Props = {
  canInteract: boolean;
  stakes: Stake[];
  isStakingLoading: boolean;
  onNavigate: (operation: Operations, addresses?: Address[]) => void;
};

export const Actions = ({ canInteract, stakes, isStakingLoading, onNavigate }: Props) => {
  const { t } = useI18n();
  const [isDialogOpen, toggleIsDialogOpen] = useToggle();
  const [isActionsOpen, toggleIsActionsOpen] = useToggle();

  const [operation, setOperation] = useState<Operations>();
  const [warningMessage, setWarningMessage] = useState('');

  if (!canInteract) {
    return (
      <div className="flex items-center justify-between">
        <SmallTitleText className="leading-[42px]">{t('staking.overview.actionsTitle')}</SmallTitleText>
      </div>
    );
  }

  const operationsSummary = stakes.reduce<Record<Operations, number>>(
    (acc, stake) => {
      acc.bond_nominate += stake.total ? 0 : 1;
      acc.bond_extra += stake.total ? 1 : 0;
      acc.unstake += stake.total ? 1 : 0;
      acc.nominate += stake.total ? 1 : 0;
      acc.set_payee += stake.total ? 1 : 0;
      acc.restake += stake.unlocking?.length > 0 ? 1 : 0;
      acc.withdraw += stake.total !== stake.active ? 1 : 0;

      return acc;
    },
    {
      bond_nominate: 0,
      bond_extra: 0,
      unstake: 0,
      nominate: 0,
      set_payee: 0,
      restake: 0,
      withdraw: 0,
    },
  );

  const otherActionsSum = Object.values(operationsSummary)
    .slice(1)
    .reduce((acc, value) => acc + value, 0);

  const noStakes = stakes.length === 0;
  const wrongOverlaps = operationsSummary.bond_nominate > 0 && otherActionsSum > 0;

  const isController = (stake: Stake): boolean => {
    return !stake.controller || toAccountId(stake.address) === toAccountId(stake.controller);
  };

  const isStash = (stake: Stake): boolean => {
    return !stake.stash || toAccountId(stake.address) === toAccountId(stake.stash);
  };

  const getIncorrectAccountType = (operation: Operations): ControllerTypes | null => {
    if (StashOperations.includes(operation)) {
      return stakes.every(isStash) ? null : ControllerTypes.STASH;
    }
    if (ControllerOperations.includes(operation)) {
      return stakes.every(isController) ? null : ControllerTypes.CONTROLLER;
    }

    return null;
  };

  const getStakeAddresses = (accountType: ControllerTypes): Address[] => {
    let filterFn: (value?: any) => boolean = () => true;
    if (accountType === ControllerTypes.STASH) {
      filterFn = isStash;
    }
    if (accountType === ControllerTypes.CONTROLLER) {
      filterFn = isController;
    }

    return stakes.filter(filterFn).map((s) => s.address);
  };

  const onClickAction = (operation: Operations, path: Operations) => {
    const incorrectType = getIncorrectAccountType(operation);

    if (incorrectType) {
      setOperation(path);
      setWarningMessage(
        t(incorrectType === ControllerTypes.STASH ? 'staking.warning.stash' : 'staking.warning.controller'),
      );

      toggleIsDialogOpen();
    } else {
      onNavigate(path);
    }
  };

  const onDeselectAccounts = () => {
    if (!operation) return;

    toggleIsDialogOpen();

    const incorrectType = getIncorrectAccountType(operation);

    if (incorrectType) {
      onNavigate(operation, getStakeAddresses(incorrectType));
    } else {
      onNavigate(operation);
    }
  };

  const getActionButtonText = (): string => {
    if (noStakes) {
      return t('staking.actions.selectAccPlaceholder');
    }
    if (wrongOverlaps) {
      return t('staking.actions.noOverlapPlaceholder');
    }

    return t('staking.actions.manageStakePlaceholder');
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <SmallTitleText>{t('staking.overview.actionsTitle')}</SmallTitleText>
        <div className="min-w-[228px]">
          <Dropdown open={isActionsOpen} onToggle={toggleIsActionsOpen}>
            <Dropdown.Trigger>
              <Button
                disabled={isStakingLoading || noStakes || wrongOverlaps}
                className="h-8.5 w-full justify-center py-2"
                suffixElement={<Icon name={isActionsOpen ? 'up' : 'down'} size={16} className="text-inherit" />}
              >
                {getActionButtonText()}
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content width="trigger">
              {Object.entries(operationsSummary).map(([key, value]) => {
                if (stakes.length !== value) return null;

                const typedKey = key as Operations;
                const option = OperationOptions[typedKey];

                return (
                  <Dropdown.Item key={key} onSelect={() => onClickAction(typedKey, option.path)}>
                    <div className="flex w-full items-center gap-x-1.5">
                      <Icon name={option.icon} size={20} className="shrink-0 text-icon-accent" />
                      {t(option.title)}
                    </div>
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Content>
          </Dropdown>
        </div>
      </div>

      <BaseModal
        isOpen={isDialogOpen}
        title={
          <div className="flex items-center gap-2.5">
            {operation && (
              <>
                <Icon name={OperationOptions[operation].icon} />
                <p>{t(OperationOptions[operation].title)}</p>
              </>
            )}
          </div>
        }
        onClose={toggleIsDialogOpen}
      >
        <p className="text-neutral-variant">
          <Trans t={t} i18nKey={warningMessage} />
        </p>

        <div className="mt-5 flex items-center gap-2.5">
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
