import {
  AccountType,
  CryptoType,
  type MultisigAccount,
  type ProxiedAccount,
  ProxyVariant,
  SigningType,
  type WcAccount,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const accounts = {
  walletConnect: {
    id: '1 0x0e465ddeaa6f65e653574ee064105b0f541938cca2e3894b3fa45d95a33fca7f 0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
    accountId: '0x0e465ddeaa6f65e653574ee064105b0f541938cca2e3894b3fa45d95a33fca7f' as AccountId,
    name: 'm',
    signingType: SigningType.WALLET_CONNECT,
    type: 'chain',
    chainId: '0x11',
    accountType: AccountType.WALLET_CONNECT,
    cryptoType: CryptoType.SR25519,
    walletId: 1,
    signingExtras: {},
  } satisfies WcAccount,
  multisig1: {
    id: '3 0x9cec42dccebe2488202950a710609eb50fe8637ddf3ffd908d6aea74eb260ebf universal',
    accountId: '0x9cec42dccebe2488202950a710609eb50fe8637ddf3ffd908d6aea74eb260ebf' as AccountId,
    name: '5DoVs...Es3ui',
    accountType: AccountType.MULTISIG,
    signingType: SigningType.MULTISIG,
    threshold: 2,
    cryptoType: CryptoType.SR25519,
    signatories: [
      {
        accountId: '0x0e465ddeaa6f65e653574ee064105b0f541938cca2e3894b3fa45d95a33fca7f' as AccountId,
      },
      {
        accountId: '0x11' as AccountId,
      },
    ],
    type: 'universal',
    walletId: 3,
  } satisfies MultisigAccount,
  multisig2: {
    id: '4 0xf9e94d71f4e3695e07e21b574e1ce2e56b228a020a34824884ed9987e6a4e4ad universal',
    accountId: '0xf9e94d71f4e3695e07e21b574e1ce2e56b228a020a34824884ed9987e6a4e4ad' as AccountId,
    name: '5HiP5...ur586',
    accountType: AccountType.MULTISIG,
    signingType: SigningType.MULTISIG,
    type: 'universal',
    walletId: 4,
    threshold: 2,
    cryptoType: CryptoType.SR25519,
    signatories: [
      {
        accountId: '0x0e465ddeaa6f65e653574ee064105b0f541938cca2e3894b3fa45d95a33fca7f' as AccountId,
      },
      {
        accountId: '0x11' as AccountId,
      },
    ],
  } satisfies MultisigAccount,
  proxy1: {
    id: '9 0x468cb8efc1544cd5000a14ad97e7750585f3378fe786046f11725c2acd5123a0 0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
    accountId: '0x468cb8efc1544cd5000a14ad97e7750585f3378fe786046f11725c2acd5123a0' as AccountId,
    accountType: AccountType.PROXIED,
    chainId: '0x11',
    cryptoType: 0,
    name: 'Any for pure 5DfD1f...WQYVRb',
    proxyVariant: ProxyVariant.PURE,
    blockNumber: 23960326,
    extrinsicIndex: 2,
    deposit: '100',
    connections: [
      {
        proxyAccountId: '0xf9e94d71f4e3695e07e21b574e1ce2e56b228a020a34824884ed9987e6a4e4ad' as AccountId,
        delay: 0,
        proxyType: 'Any',
      },
    ],
    signingType: SigningType.WATCH_ONLY,
    type: 'chain',
    walletId: 9,
  } satisfies ProxiedAccount,
  emptyWallet: {
    id: '8 0xe41def6480474253c2aa26e138da902771875ca8a979926e691a8bae41fcd218 0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
    accountId: '0xe41def6480474253c2aa26e138da902771875ca8a979926e691a8bae41fcd218' as AccountId,
    cryptoType: CryptoType.SR25519,
    chainId: '0x11',
    name: 'empt',
    accountType: 'wallet_connect',
    signingType: 'signing_wc',
    type: 'chain',
    walletId: 8,
    signingExtras: {},
  } as WcAccount,
};
