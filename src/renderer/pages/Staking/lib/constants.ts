import { Operations } from './types';
import { IconNames } from '@shared/ui/Icon/data';

export const StashOperations: Operations[] = [Operations.BOND_EXTRA];

export const ControllerOperations: Operations[] = [
  Operations.BOND_NOMINATE,
  Operations.UNSTAKE,
  Operations.RESTAKE,
  Operations.WITHDRAW,
  Operations.NOMINATE,
  Operations.SET_PAYEE,
];

export const OperationOptions: Record<Operations, { icon: IconNames; title: string; path: Operations }> = {
  [Operations.BOND_NOMINATE]: {
    icon: 'startStaking',
    title: 'staking.actions.startStakingLabel',
    path: Operations.BOND_NOMINATE,
  },
  [Operations.BOND_EXTRA]: {
    icon: 'stakeMore',
    title: 'staking.actions.stakeMoreLabel',
    path: Operations.BOND_EXTRA,
  },
  [Operations.UNSTAKE]: {
    icon: 'unstake',
    title: 'staking.actions.unstakeLabel',
    path: Operations.UNSTAKE,
  },
  [Operations.RESTAKE]: {
    icon: 'returnToStake',
    title: 'staking.actions.returnToStakeLabel',
    path: Operations.RESTAKE,
  },
  [Operations.WITHDRAW]: {
    icon: 'redeem',
    title: 'staking.actions.redeemLabel',
    path: Operations.WITHDRAW,
  },
  [Operations.NOMINATE]: {
    icon: 'changeValidators',
    title: 'staking.actions.changeValidatorsLabel',
    path: Operations.NOMINATE,
  },
  [Operations.SET_PAYEE]: {
    icon: 'destination',
    title: 'staking.actions.destinationLabel',
    path: Operations.SET_PAYEE,
  },
};
