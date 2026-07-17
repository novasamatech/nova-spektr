import { type Chain, SigningType } from '@/shared/core';
import { includesMultiple, nonNullable, toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';

import { Step } from './types';

export const transferUtils = {
  isNoneStep,
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,
  isBasketStep,
  canReceiveOnChain,
  filterRecipientAccounts,
};

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}

function isInitStep(step: Step): boolean {
  return step === Step.INIT;
}

function isConfirmStep(step: Step): boolean {
  return step === Step.CONFIRM;
}

function isSignStep(step: Step): boolean {
  return step === Step.SIGN;
}

function isSubmitStep(step: Step): boolean {
  return step === Step.SUBMIT;
}

function isBasketStep(step: Step): boolean {
  return step === Step.BASKET;
}

/**
 * Signing types whose accounts represent keys the user actually holds. Keyless
 * constructs (watch-only, multisig, proxied / pure proxy, signatory
 * placeholders) are stamped WATCH_ONLY or MULTISIG at creation.
 */
const KEYED_SIGNING_TYPES = [
  SigningType.PARITY_SIGNER,
  SigningType.POLKADOT_VAULT,
  SigningType.EXTENSION,
  SigningType.WALLET_CONNECT,
];

/**
 * Checks that an account can act as a transfer recipient on the chain. Keyed
 * accounts control their address on any scheme-compatible chain even when the
 * key is scoped to another chain, so requiring signing availability would hide
 * key-set vault derived keys that are perfectly valid recipients. Accounts
 * whose key the user doesn't hold (watch-only, multisig, proxied / pure proxy,
 * signatory placeholders) keep the strict availability rule of their own wallet
 * feature — the transfer feature can't assume such an address is controlled on
 * a foreign chain, and funds sent there may be lost.
 */
function canReceiveOnChain(account: AnyAccount, chain: Chain): boolean {
  if (KEYED_SIGNING_TYPES.includes(account.signingType)) {
    return accountService.isCryptoMatch(account, chain);
  }

  return accountService.isAccountAvailableOnChain(account, chain);
}

type FilterRecipientAccountsParams<T extends AnyAccount> = {
  accounts: T[];
  chain: Chain;
  query: string;
  initiator?: AnyAccount | null;
};

/**
 * Filters own accounts offered as transfer recipients: everything that can
 * receive on the chain (see canReceiveOnChain), minus the sender, matching the
 * search query by name or address.
 */
function filterRecipientAccounts<T extends AnyAccount>({
  accounts,
  chain,
  query,
  initiator,
}: FilterRecipientAccountsParams<T>): T[] {
  return accounts.filter((account) => {
    if (!canReceiveOnChain(account, chain)) return false;
    if (nonNullable(initiator) && initiator.accountId === account.accountId) return false;

    const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

    return includesMultiple([account.name, address], query);
  });
}

export {
  categorizeXcmError,
  getHumanReadableXcmError as getHumanReadableFailureReason,
  normalizeXcmError,
} from '@/shared/api/xcm/service/xcm-error-utils';
