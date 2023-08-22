export const DEFAULT_PROJECT_ID = '4fae85e642724ee66587fa9f37b997e2';
export const DEFAULT_RELAY_URL = 'wss://relay.walletconnect.com';

export const DEFAULT_LOGGER = 'debug';

export const DEFAULT_APP_METADATA = {
  name: 'Nova Spektr', //dApp name
  description: 'Nova Spektr Enterprise Wallet', //dApp description
  url: '#', //dApp url
  icons: ['https://walletconnect.com/walletconnect-logo.png'], //dApp logo url
  verifyUrl: 'https://verify.walletconnect.com',
};

/**
 * POLKADOT
 */
export enum DEFAULT_POLKADOT_METHODS {
  POLKADOT_SIGN_TRANSACTION = 'polkadot_signTransaction',
}

export enum DEFAULT_POLKADOT_EVENTS {
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
