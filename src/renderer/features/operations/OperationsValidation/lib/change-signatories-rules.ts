import { type BN } from '@polkadot/util';

import { assert } from '@/shared/lib/utils';
import { createTxValidator } from '@/shared/transactions';
import { accountService, balanceService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { AddProxyRules } from './add-proxy-rules';

// Edit Flexible Multisig executes an `add_proxy` against an existing proxied
// account, so the balance/description checks are identical to AddProxy.
// Re-exported here to keep the rules-per-flow file convention without
// duplicating validator logic.
export const ChangeSignatoriesRules = {
  account: AddProxyRules.account,
  signatory: AddProxyRules.signatory,
  description: AddProxyRules.description,
};

export const changeSignatoriesValidator = createTxValidator<{ proxyDeposit: BN }>({
  additionalBalanceRules: [
    ({ route, getBalance, asset, proxyDeposit }) => {
      const initiator = accountService.findInitiator(route);
      assert(initiator, 'Initiator not found');

      if (!accountUtils.isFlexibleMultisigAccount(initiator)) {
        throw new Error('Initiator is not a flexible multisig account');
      }

      const balance = getBalance(initiator.accountId, initiator.chainId, asset.assetId);
      assert(balance, 'Balance not found');

      return {
        account: initiator,
        balance: balanceService.tryReserve(balance, proxyDeposit, 'legacy'),
        asset: asset,
        action: 'proxy deposit',
      };
    },
  ],
});
