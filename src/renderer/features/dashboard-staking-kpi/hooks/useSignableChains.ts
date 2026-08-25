import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { isSignerAccount } from '@/features/signing-path';

/**
 * Chains this installation holds a signing key for.
 *
 * A payout is permissionless — it names the validator, and the reward reaches
 * each nominator's own payee whoever submits it — so what gates the Claim
 * button is not "do we hold the nominator" but "can we sign _anything_ on this
 * network". An address-book position is claimable; a network we only watch is
 * not.
 *
 * Which accounts count is not restated here: `isSignerAccount` is the
 * signing-path graph's own definition, and a KPI tile that judged signers by a
 * stricter rule than the flow it links to would hide claims the user can
 * actually make.
 *
 * Read from the account domain's own list rather than off `Wallet.accounts`.
 * The accounts hanging off a wallet are a deprecated mirror of that list, and
 * the twin of this hook on the positions widget (`useChainHasSigner`) reads the
 * domain. Two sources for one question is how the two dashboard surfaces came
 * to disagree about virtual signatory placeholders — one offering a Claim the
 * other hid.
 */
export const useSignableChains = (): Set<ChainId> => {
  const allAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);

  return useMemo(() => {
    const signable = new Set<ChainId>();

    for (const account of allAccounts) {
      if (!isSignerAccount(account)) continue;

      for (const chain of Object.values(chains)) {
        if (signable.has(chain.chainId)) continue;
        if (accountService.isAccountAvailableOnChain(account, chain)) {
          signable.add(chain.chainId);
        }
      }
    }

    return signable;
  }, [allAccounts, chains]);
};
