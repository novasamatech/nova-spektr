import {
  AccountType,
  type Address,
  type Chain,
  ChainOptions,
  CryptoType,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type NoID,
  type ProxiedAccount,
  SigningType,
} from '@/shared/core';
import { isEthereumAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const multisigUtils = {
  isMultisigSupported,
  isFlexibleMultisigSupported,
  buildMultisigAccount,
  buildFlexibleMultisigAccount,
  getOtherSignatories,
};

function getOtherSignatories(
  account: MultisigAccount | FlexibleMultisigAccount,
  signer: AccountId | Address,
  addressPrefix: number,
) {
  const signerAddress = toAddress(signer, { prefix: addressPrefix });

  return (
    Array.from(account.signatories)
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
      .sort((a, b) => a.accountId.localeCompare(b.accountId))
      .map((s) => toAddress(s.accountId, { prefix: addressPrefix }))
      .filter((address) => address !== signerAddress)
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
    signingType: SigningType.MULTISIG,
    accountType: AccountType.MULTISIG,
    type: 'chain',
  };

  return account;
}

type BuildFlexibleMultisigParams = {
  threshold: number;
  accountId: AccountId;
  signatories: AccountId[];
  chain: Chain;
  proxyAccount: ProxiedAccount;
};

function buildFlexibleMultisigAccount({
  threshold,
  accountId,
  proxyAccount,
  signatories,
  chain,
}: BuildFlexibleMultisigParams) {
  const account: NoID<Omit<FlexibleMultisigAccount, 'walletId'>> = {
    threshold,
    accountId,
    proxyAccount,
    signatories: signatories.map((signatory) => ({
      accountId: signatory,
      address: toAddress(signatory),
    })),
    name: toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
    chainId: chain.chainId,
    cryptoType: isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
    signingType: SigningType.MULTISIG,
    accountType: AccountType.FLEXIBLE_MULTISIG,
    type: 'chain',
  };

  return account;
}
