import { type Wallet, WalletType } from '@/shared/core';
import { type AnyAccount, accountsService } from '@/domains/network';

import { type PolkadotExtensionAccount, type PolkadotExtensionWallet } from './types';

function isPolkadotExtensionWallet(wallet: Wallet): wallet is PolkadotExtensionWallet {
  return wallet.type === WalletType.POLKADOT_EXTENSION;
}

function isPolkadotExtensionAccount(account: AnyAccount): account is PolkadotExtensionAccount {
  return (
    accountsService.isUniversalAccount(account) && 'accountType' in account && account['accountType'] === 'extension'
  );
}

export const polkadotExtensionService = {
  isPolkadotExtensionAccount,
  isPolkadotExtensionWallet,
};
