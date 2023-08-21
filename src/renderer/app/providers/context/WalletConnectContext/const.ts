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
 * EIP155
 */
export enum DEFAULT_EIP155_METHODS {
  ETH_SEND_TRANSACTION = 'eth_sendTransaction',
  PERSONAL_SIGN = 'personal_sign',
}

export enum DEFAULT_EIP155_OPTIONAL_METHODS {
  ETH_SIGN_TRANSACTION = 'eth_signTransaction',
  ETH_SIGN = 'eth_sign',
  ETH_SIGN_TYPED_DATA = 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4',
}

export enum DEFAULT_EIP_155_EVENTS {
  ETH_CHAIN_CHANGED = 'chainChanged',
  ETH_ACCOUNTS_CHANGED = 'accountsChanged',
}

/**
 * POLKADOT
 */
export enum DEFAULT_POLKADOT_METHODS {
  POLKADOT_SIGN_TRANSACTION = 'polkadot_signTransaction',
  POLKADOT_SIGN_MESSAGE = 'polkadot_signMessage',
}

export enum DEFAULT_POLKADOT_EVENTS {}

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
