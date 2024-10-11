import { createTestKeyring } from '@polkadot/keyring';

import {
  AccountType,
  type Asset,
  type BaseAccount,
  type Chain,
  type ChainAccount,
  ChainType,
  CryptoType,
  type PolkadotVaultWallet,
  type ShardAccount,
  SigningType,
  WalletType,
} from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';

export const dotAsset: Asset = {
  assetId: 0,
  symbol: 'DOT',
  precision: 10,
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/assets/white/Polkadot_(DOT).svg',
  name: 'Polkadot',
};

export const polkadotChain: Chain = {
  name: 'Polkadot',
  specName: 'polkadot',
  addressPrefix: 0,
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  icon: '',
  options: [],
  nodes: [],
  assets: [dotAsset],
  explorers: [
    {
      name: 'Subscan',
      extrinsic: 'https://polkadot.subscan.io/extrinsic/{hash}',
      account: 'https://polkadot.subscan.io/account/{address}',
      multisig: 'https://polkadot.subscan.io/multisig_extrinsic/{index}?call_hash={callHash}',
    },
    {
      name: 'Sub.ID',
      account: 'https://sub.id/{address}',
    },
  ],
};

const testKeyring = createTestKeyring();

export const createBaseAccount = (id: number): BaseAccount => ({
  id,
  accountId: toAccountId(testKeyring.addFromUri(`//${Math.round((Math.random() + id) * 1000)}`).address),
  chainType: ChainType.SUBSTRATE,
  cryptoType: CryptoType.SR25519,
  name: `Base Account ${id}`,
  type: AccountType.BASE,
  walletId: 1,
});

export const createPolkadotWallet = (
  id: number,
  accounts: (BaseAccount | ChainAccount | ShardAccount)[],
): PolkadotVaultWallet => ({
  id,
  accounts,
  type: WalletType.POLKADOT_VAULT,
  isActive: true,
  name: `Polkadot vault wallet ${id}`,
  signingType: SigningType.POLKADOT_VAULT,
});
