import { createSlot } from '@/shared/di';

export const stakingUnstakeSlot = createSlot({ name: 'staking/unstake' });
export const stakingWithdrawSlot = createSlot({ name: 'staking/withdraw' });
export const stakingBondExtraSlot = createSlot({ name: 'staking/bond-extra' });
export const stakingRestakeSlot = createSlot({ name: 'staking/restake' });
export const stakingBondNominateSlot = createSlot({ name: 'staking/bond-nominate' });
export const stakingNominateSlot = createSlot({ name: 'staking/nominate' });
export const stakingPayeeSlot = createSlot({ name: 'staking/payee' });
