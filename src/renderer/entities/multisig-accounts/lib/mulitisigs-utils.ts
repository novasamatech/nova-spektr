import {
  type Chain,
  type MultisigAccount,
  type NoID,
  AccountType,
  ChainOptions,
  CryptoType,
  SigningType,
} from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { multisigOperationService } from '@/domains/network';

export const multisigUtils = {
  isFlexibleMultisigSupported,
  buildMultisigAccount,
};

function isFlexibleMultisigSupported(chain: Chain) {
  const options = chain.options ?? [];

  return (
    multisigOperationService.isMultisigSupported(chain) &&
    (options.includes(ChainOptions.REGULAR_PROXY) || options.includes(ChainOptions.PURE_PROXY))
  );
}

type BuildMultisigParams = {
  threshold: number;
  accountId: AccountId;
  signatories: AccountId[];
  name: string;
};

function buildMultisigAccount({ threshold, accountId, signatories, name }: BuildMultisigParams) {
  const account: NoID<Omit<MultisigAccount, 'walletId'>> = {
    threshold: threshold,
    accountId: accountId,
    signatories: signatories.map((signatory) => ({
      accountId: signatory,
    })),
    name: name,
    cryptoType: isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
    signingType: SigningType.MULTISIG,
    accountType: AccountType.MULTISIG,
    type: 'universal',
  };

  return account;
}
