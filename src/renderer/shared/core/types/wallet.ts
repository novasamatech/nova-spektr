import type { ID } from './general';

export type Wallet = {
  id: ID;
  name: string;
  type: WalletType;
  isActive: boolean;
  signingType: SigningType;
};

export const enum WalletType {
  WATCH_ONLY = 'wallet_wo',
  MULTISHARD_PARITY_SIGNER = 'wallet_mps',
  SINGLE_PARITY_SIGNER = 'wallet_sps',
  MULTISIG = 'wallet_ms',
  // POLKADOT_VAULT = 'wallet_pv',
  WALLET_CONNECT = 'wallet_wc',
  NOVA_WALLET = 'wallet_nw',
}

export const enum SigningType {
  WATCH_ONLY = 'signing_wo',
  PARITY_SIGNER = 'signing_ps',
  MULTISIG = 'signing_ms',
  // POLKADOT_VAULT = 'signing_pv',
  WALLET_CONNECT = 'signing_wc',
  // NOVA_WALLET = 'signing_nw',
}
