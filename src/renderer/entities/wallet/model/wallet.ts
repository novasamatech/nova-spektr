export type Wallet = {
  name: string;
  type: WalletType;
  isActive?: boolean;
  signingType?: SigningType;
};

export const enum WalletType {
  WATCH_ONLY = 'wallet_wo',
  SINGLE_PARITY_SIGNER = 'wallet_sps',
  MULTISHARD_PARITY_SIGNER = 'wallet_mps',
  MULTISIG = 'wallet_ms',
}

export const enum SigningType {
  WATCH_ONLY = 'signing_wo',
  PARITY_SIGNER = 'signing_ps',
  MULTISIG = 'signing_ms',
}

export function createWallet({ name, type }: Wallet): Wallet {
  return {
    name,
    type,
  } as Wallet;
}
