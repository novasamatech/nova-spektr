import { SigningType, type Wallet, WalletType } from '@/shared/core';

/**
 * Polkadot Vault wallet (hardware wallet)
 */
export const vaultWallet: Wallet = {
  id: 1,
  name: 'Vault Wallet',
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
};

/**
 * Multisig wallet
 */
export const multisigWallet: Wallet = {
  id: 2,
  name: 'Multisig Wallet',
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
};

/**
 * Watch-only wallet (no signing capability)
 */
export const watchOnlyWallet: Wallet = {
  id: 3,
  name: 'Watch Only Wallet',
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
};

/**
 * Proxied wallet
 */
export const proxiedWallet: Wallet = {
  id: 4,
  name: 'Proxied Wallet',
  type: WalletType.PROXIED,
  signingType: SigningType.POLKADOT_VAULT,
};
