import { CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';
import { polkadotChainId } from '../chain';
import { multisigWallet, proxiedWallet, vaultWallet, watchOnlyWallet } from '../wallet';

/**
 * Basic sender account (vault wallet)
 */
export const senderAccount: AnyAccount = {
  id: 'sender-1',
  accountId: createAccountId(1),
  walletId: vaultWallet.id,
  name: 'Sender Account',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
};

/**
 * Basic recipient account (watch-only)
 */
export const recipientAccount: AnyAccount = {
  id: 'recipient-1',
  accountId: createAccountId(2),
  walletId: watchOnlyWallet.id,
  name: 'Recipient Account',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WATCH_ONLY,
};

/**
 * Multisig account (2 of 3)
 */
export const multisigAccount: AnyAccount = {
  id: 'multisig-1',
  accountId: createAccountId(10),
  walletId: multisigWallet.id,
  name: 'Multisig Account',
  type: 'multisig',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 2,
  signatories: [
    {
      accountId: createAccountId(11),
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      name: 'Signatory 1',
    },
    {
      accountId: createAccountId(12),
      address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      name: 'Signatory 2',
    },
    {
      accountId: createAccountId(13),
      address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
      name: 'Signatory 3',
    },
  ],
};

/**
 * Signatory account (for multisig operations)
 */
export const signatoryAccount: AnyAccount = {
  id: 'signatory-1',
  accountId: createAccountId(11),
  walletId: vaultWallet.id,
  name: 'Signatory 1',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
};

/**
 * Proxied account
 */
export const proxiedAccount: AnyAccount = {
  id: 'proxied-1',
  accountId: createAccountId(20),
  walletId: proxiedWallet.id,
  name: 'Proxied Account',
  type: 'proxied',
  chainId: polkadotChainId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  proxyVariant: 'regular',
  connections: [
    {
      proxyAccountId: createAccountId(21),
      delay: 0,
      proxyType: 'Any',
    },
  ],
  deposit: '100000000000',
  blockNumber: 12345,
  extrinsicIndex: 0,
};

/**
 * Proxy account (acts on behalf of proxied account)
 */
export const proxyAccount: AnyAccount = {
  id: 'proxy-1',
  accountId: createAccountId(21),
  walletId: vaultWallet.id,
  name: 'Proxy Account',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
};
