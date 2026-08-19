import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
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
 */
export const useSignableChains = (): Set<ChainId> => {
  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);

  return useMemo(() => {
    const signable = new Set<ChainId>();

    for (const wallet of wallets) {
      for (const account of wallet.accounts) {
        if (!isSignerAccount(account)) continue;

        for (const chain of Object.values(chains)) {
          if (signable.has(chain.chainId)) continue;
          if (accountService.isAccountAvailableOnChain(account, chain)) {
            signable.add(chain.chainId);
          }
        }
      }
    }

    return signable;
  }, [wallets, chains]);
};
