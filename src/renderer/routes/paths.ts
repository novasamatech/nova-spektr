const Paths = {
  LOGIN: '/login',

  // Onboarding
  ONBOARDING: '/onboarding',
  WATCH_ONLY: '/onboarding/watch-only',
  PARITY: '/onboarding/parity',
  LEDGER: '/onboarding/ledger',

  // Settings
  SETTINGS: '/settings',
  NETWORK: '/settings/network',
  CREDENTIALS: '/settings/credentials',

  // Staking
  STAKING: '/staking',
  STAKING_START: '/staking/start',
  UNBOND: '/staking/unbond',

  // Navigation
  ADDRESS_BOOK: '/address-book',
  HISTORY: '/history',
  MULTISIG: '/multisig',
  BALANCES: '/balances',
  TRANSFER: '/transfer/:chainId/:assetId',
  SIGNING: '/signing',

  // DEV
  CHAT_DEV: '/chat-dev',
  CAMERA_DEV: '/camera-dev',
};

export default Paths;
