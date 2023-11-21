import type { ObjectValues } from '../core';

export const Paths = {
  ROOT: '/',

  // Onboarding
  ONBOARDING: '/onboarding',

  // Assets
  ASSETS: '/assets',
  SEND_ASSET: '/assets/send',
  RECEIVE_ASSET: '/assets/receive',

  // Navigation
  OPERATIONS: '/operations',
  NOTIFICATIONS: '/notifications',

  // Address book
  ADDRESS_BOOK: '/address-book',
  CREATE_CONTACT: '/address-book/create-contact',
  EDIT_CONTACT: '/address-book/edit-contact',

  // Settings
  SETTINGS: '/settings',
  NETWORK: '/settings/network',
  CURRENCY: '/settings/currency',
  MATRIX: '/settings/matrix',

  // Staking
  STAKING: '/staking',
  BOND: '/staking/bond/:chainId',
  UNSTAKE: '/staking/unstake/:chainId',
  DESTINATION: '/staking/destination/:chainId',
  RESTAKE: '/staking/restake/:chainId',
  REDEEM: '/staking/redeem/:chainId',
  STAKE_MORE: '/staking/stake-more/:chainId',
  VALIDATORS: '/staking/validators/:chainId',
} as const;

export type PathType = ObjectValues<typeof Paths>;
