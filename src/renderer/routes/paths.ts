const Paths = {
  ROOT: '/',

  // Onboarding
  ONBOARDING: '/onboarding',

  // Navigation
  HISTORY: '/history',
  MULTISIG: '/multisig',
  BALANCES: '/balances',
  OPERATIONS: '/operations',
  SIGNING: '/signing',
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

  // Operations
  // CREATE_MULTISIG_ACCOUNT: '/create-multisig-account',

  // DEV
  CHAT_DEV: '/chat-dev',
  CAMERA_DEV: '/camera-dev',
} as const;

export type PathValue = (typeof Paths)[keyof typeof Paths];

export default Paths;
