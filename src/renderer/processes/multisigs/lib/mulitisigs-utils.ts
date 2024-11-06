import {
  type AccountId,
  AccountType,
  type Chain,
  ChainOptions,
  ChainType,
  CryptoType,
  type MultisigAccount,
  type NoID,
} from '@/shared/core';
import { isEthereumAccountId, toAddress } from '@/shared/lib/utils';

export const multisigUtils = {
  isMultisigSupported,
  buildMultisigAccount,
};

function isMultisigSupported(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.MULTISIG));
}

type BuildMultisigParams = {
  threshold: number;
  accountId: AccountId;
  signatories: AccountId[];
  chain: Chain;
};

function buildMultisigAccount({ threshold, accountId, signatories, chain }: BuildMultisigParams) {
  const account: NoID<Omit<MultisigAccount, 'walletId'>> = {
    threshold: threshold,
    accountId: accountId,
    signatories: signatories.map((signatory) => ({
      accountId: signatory,
      address: toAddress(signatory),
    })),
    name: toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
    chainId: chain.chainId,
    cryptoType: isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    type: AccountType.MULTISIG,
  };

  return account;
}
