import { type Wallet, CryptoType, SigningType, WalletType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';

import { kusamaAssetHubChainId } from './chains';

/**
 * A wallet whose accounts are universal, so every Asset Hub sees all of them.
 * Deliberately not a Polkadot Vault: the base-account shadowing rule is a
 * separate concern from position derivation.
 */
export const stakingWallet: Wallet = {
  id: 42,
  name: 'Staking Wallet',
  type: WalletType.WALLET_CONNECT,
  accounts: [],
};

function createStakingAccount(id: string, name: string): AnyAccount {
  return {
    id,
    accountId: createAccountId(id),
    walletId: stakingWallet.id,
    name,
    type: 'universal',
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.WALLET_CONNECT,
    createdAt: 0,
  };
}

export const stakingAccountA = createStakingAccount('staking-a', 'Staking A');
export const stakingAccountB = createStakingAccount('staking-b', 'Staking B');

/**
 * Chain-scoped account — only Kusama Asset Hub may request it.
 */
export const stakingKusamaOnlyAccount: AnyAccount = {
  id: 'staking-kusama-only',
  accountId: createAccountId('staking-kusama-only'),
  walletId: stakingWallet.id,
  name: 'Staking Kusama Only',
  type: 'chain',
  chainId: kusamaAssetHubChainId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WALLET_CONNECT,
  createdAt: 0,
};

export const validatorOne = createAccountId('validator-one');
export const validatorTwo = createAccountId('validator-two');
export const validatorThree = createAccountId('validator-three');
export const validatorFour = createAccountId('validator-four');
