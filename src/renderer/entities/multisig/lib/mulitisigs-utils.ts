import {
  AccountType,
  type Chain,
  ChainOptions,
  CryptoType,
  type MultisigAccount,
  type NoID,
  SigningType,
} from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const multisigUtils = {
  isMultisigSupported,
  isFlexibleMultisigSupported,
  buildMultisigAccount,
  getOtherSignatories,
};

function getOtherSignatories(account: MultisigAccount, signer: AccountId) {
  return (
    Array.from(account.signatories)
      .map((s) => s.accountId)
      /**
       * Public keys of signers' wallets are compared byte-for-byte and sorted
       * ascending before being used to generate the multisig address. For
       * example, consider the scenario with three addresses, A, B, and C,
       * starting with 5FUGT, 5HMfS, and 5GhKJ. If we build the ABC multisig
       * with the accounts in that specific order (i.e. first A, then B, and C),
       * the real order of the accounts in the multisig will be ACB. If, in the
       * Extrinsic tab, we initiate a multisig call with C, the order of the
       * other signatories will be first A, then B. If we put first B, then A,
       * the transaction will fail.
       */
      .sort((a, b) => a.localeCompare(b))
      .filter((account) => account !== signer)
  );
}

function isMultisigSupported(chain: Chain) {
  return chain.options?.includes(ChainOptions.MULTISIG) ?? false;
}

function isFlexibleMultisigSupported(chain: Chain) {
  const options = chain.options ?? [];

  return (
    isMultisigSupported(chain) &&
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
