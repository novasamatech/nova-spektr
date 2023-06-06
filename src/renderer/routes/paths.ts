const Paths = {
  ROOT: '/',

  // Onboarding
  ONBOARDING: '/onboarding',
  WATCH_ONLY: 'watch-only',
  PARITY: 'parity',
  LEDGER: 'ledger',

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
  NETWORK: 'network',
  MATRIX: 'matrix',

  // Staking
  STAKING: '/staking',
  BOND: 'bond/:chainId',
  UNSTAKE: 'unstake/:chainId',
  DESTINATION: 'destination/:chainId',
  RESTAKE: 'restake/:chainId',
  REDEEM: 'redeem/:chainId',
  STAKE_MORE: 'stake-more/:chainId',
  VALIDATORS: 'validators/:chainId',

  // Operations
  CREATE_MULTISIG_ACCOUNT: '/create-multisig-account',

  // DEV
  CHAT_DEV: '/chat-dev',
  CAMERA_DEV: '/camera-dev',
} as const;

export type PathValue = (typeof Paths)[keyof typeof Paths];

export default Paths;
