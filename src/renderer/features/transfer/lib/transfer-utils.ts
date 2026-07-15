import { type Chain } from '@/shared/core';
import { includesMultiple, nonNullable, toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

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
 * Checks that an account can act as a transfer recipient on the chain. Keyed
 * accounts control their address on any scheme-compatible chain even when the
 * key is scoped to another chain, so requiring signing availability would hide
 * key-set vault derived keys that are perfectly valid recipients. Keyless
 * on-chain constructs (multisig, proxied / pure proxy) exist only where their
 * pallets and relationships do — those keep the strict availability rule,
 * otherwise funds sent to them on a foreign chain are lost.
 */
function canReceiveOnChain(account: AnyAccount, chain: Chain): boolean {
  if (accountUtils.isAnyMultisigAccount(account) || accountUtils.isProxiedAccount(account)) {
    return accountService.isAccountAvailableOnChain(account, chain);
  }

  return accountService.isCryptoMatch(account, chain);
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
