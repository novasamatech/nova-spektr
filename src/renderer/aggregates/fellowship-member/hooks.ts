import { useUnit } from 'effector-react';

import { fellowshipMember } from './model';

export const useFellowshipMember = () => {
  return useUnit(fellowshipMember.$currentMember);
};

export const useFellowshipAccount = () => {
  return useUnit(fellowshipMember.$currentMemberAccount);
};

export const useFellowshipWallet = () => {
  return useUnit(fellowshipMember.$currentMemberWallet);
};
