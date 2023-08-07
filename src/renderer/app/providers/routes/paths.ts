export const Paths = {
  ROOT: '/',

  // Onboarding
  ONBOARDING: '/onboarding',

  // Navigation
  ASSETS: '/assets',
  OPERATIONS: '/operations',
  NOTIFICATIONS: '/notifications',

  // Address book
  ADDRESS_BOOK: '/address-book',
  MANAGE_CONTACT: '/address-book/contact',

  // Settings
  SETTINGS: '/settings',
  NETWORK: '/settings/network',

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

export type PathValue = (typeof Paths)[keyof typeof Paths];
