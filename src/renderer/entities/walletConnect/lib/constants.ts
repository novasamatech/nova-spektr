export const DEFAULT_PROJECT_ID = 'af50115ecc7e992a0ef4a577daf5c1c8';
export const DEFAULT_RELAY_URL = 'wss://relay.walletconnect.com';

export const DEFAULT_LOGGER = 'debug';

export const DEFAULT_APP_METADATA = {
  name: 'Nova Spektr', //dApp name
  description: 'Full-spectrum Polkadot Desktop Wallet', //dApp description
  url: 'https://novaspektr.io', //dApp url
  icons: ['https://drive.google.com/uc?id=1oud8FHw3PcldUgHVeX5OjCg8XANhGO5s'], //dApp logo url
  verifyUrl: 'https://verify.walletconnect.com',
};

/**
 * POLKADOT
 */
export const enum DEFAULT_POLKADOT_METHODS {
  POLKADOT_SIGN_TRANSACTION = 'polkadot_signTransaction',
}

export const enum DEFAULT_POLKADOT_EVENTS {
  CHAIN_CHANGED = 'chainChanged',
  ACCOUNTS_CHANGED = 'accountsChanged',
}

type RelayerType = {
  value: string | undefined;
  label: string;
};

export const REGIONALIZED_RELAYER_ENDPOINTS: RelayerType[] = [
  {
    value: DEFAULT_RELAY_URL,
    label: 'Default',
  },

  {
    value: 'wss://us-east-1.relay.walletconnect.com',
    label: 'US',
  },
  {
    value: 'wss://eu-central-1.relay.walletconnect.com',
    label: 'EU',
  },
  {
    value: 'wss://ap-southeast-1.relay.walletconnect.com',
    label: 'Asia Pacific',
  },
];

export const WALLETCONNECT_CLIENT_ID = 'WALLETCONNECT_CLIENT_ID';

export const EXTEND_PAIRING = 60 * 60 * 24 * 30; // 30 days

export const FIRST_CHAIN_ID_SYMBOL = 2;
export const LAST_CHAIN_ID_SYMBOL = 34;
