import { useUnit } from 'effector-react';

import { stakingAccounts } from './model';

export const useStakingAccounts = () => {
  return useUnit(stakingAccounts.$accounts);
};

export const useSelectedNominators = () => {
  return useUnit(stakingAccounts.$selectedNominators);
};

export const useIsMultipleSelected = () => {
  return useUnit(stakingAccounts.$isMultipleSelected);
};

export const useStakingData = () => {
  return useUnit(stakingAccounts.$stakingData);
};

export const useIsStakingLoading = () => {
  return useUnit(stakingAccounts.$isStakingLoading);
};
