const Paths = {
  // Onboarding
  ONBOARDING: '/onboarding',
  WATCH_ONLY: '/onboarding/watch-only',
  PARITY: '/onboarding/parity',
  LEDGER: '/onboarding/ledger',

  // Navigation
  ADDRESS_BOOK: '/address-book',
  HISTORY: '/history',
  MULTISIG: '/multisig',
  BALANCES: '/balances',
  OPERATIONS: '/operations',
  SIGNING: '/signing',
  NOTIFICATIONS: '/notifications',

  // Settings
  SETTINGS: '/settings',
  NETWORK: '/settings/network',
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

  // Operations
  TRANSFER: '/transfer/:chainId/:assetId',

  CREATE_MULTISIG_ACCOUNT: '/create-multisig-account',

  // DEV
  CHAT_DEV: '/chat-dev',
  CAMERA_DEV: '/camera-dev',
} as const;

export type PathValue = (typeof Paths)[keyof typeof Paths];

export default Paths;
