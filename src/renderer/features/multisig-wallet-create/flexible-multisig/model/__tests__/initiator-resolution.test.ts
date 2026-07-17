import { allSettled, fork } from 'effector';
import { describe, expect, test } from 'vitest';

import { type Wallet, ConnectionStatus, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import * as networkDomain from '@/domains/network';
import { accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { flexibleMultisigModel } from '../flexible-multisig-create';
import { formModel } from '../form-model';
import { signatoryModel } from '../signatory-model';

import { testApi, testChain } from './mock';

const makeKey = (id: string, seed: string): networkDomain.AnyAccount => ({
  id,
  walletId: 1,
  name: `key ${id}`,
  type: 'chain',
  accountId: createAccountId(seed),
  chainId: testChain.chainId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: Date.now(),
});

const keyA = makeKey('key-a', '10');
const keyB = makeKey('key-b', '11');

const vaultWallet: Wallet = {
  id: 1,
  name: 'PTL Keys',
  type: WalletType.POLKADOT_VAULT,
  accounts: [keyA, keyB],
} as Wallet;

describe('flexible multisig initiator resolution', () => {
  // The DI anyOf registries (accountAvailabilityOnChainAnyOf, accountActionPermissionAnyOf)
  // register handlers through unscoped events at module import. `$initiator`/`$signatory`
  // here are derived via `combine`, which under `fork()` reads the registry through the
  // *scoped* `getState()` — an unscoped registerHandler() call never reaches that scope
  // registry, so every availability check would silently resolve to `false`. Registering
  // the stub handlers inside the scope (via allSettled) is the established fix — see
  // tests/integrations/utils/framework/seedAccountHandlers.ts.
  const makeScope = async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { [testChain.chainId]: testApi })
        .set(networkModel.$chains, { [testChain.chainId]: testChain })
        .set(networkModel.$connectionStatuses, { [testChain.chainId]: ConnectionStatus.CONNECTED })
        .set(walletModel.__test.$rawWallets, [vaultWallet])
        .set(networkDomain.accounts.__test.$list, [keyA, keyB]),
    });

    await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
      scope,
      params: {
        body: ({ account, chain }) =>
          accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
        available: () => true,
      },
    });
    await allSettled(accountService.accountActionPermissionAnyOf.registerHandler, {
      scope,
      params: {
        body: () => true,
        available: () => true,
      },
    });

    return scope;
  };

  test('initiator is the key selected as signatory, not the first key of the wallet', async () => {
    const scope = await makeScope();

    await allSettled(formModel.form.fields.chainId.change, { scope, params: testChain.chainId });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'PTL Keys', address: toAddress(keyB.accountId), walletId: '1' },
    });

    expect(scope.getState(flexibleMultisigModel.$initiator)?.accountId).toEqual(keyB.accountId);
  });

  test('explicit signer selection is not overridden by the derived signatory list', async () => {
    const scope = await makeScope();

    await allSettled(formModel.form.fields.chainId.change, { scope, params: testChain.chainId });
    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'PTL Keys', address: toAddress(keyB.accountId), walletId: '1' },
    });
    await allSettled(flexibleMultisigModel.signatorySelected, { scope, params: keyB });

    expect(scope.getState(flexibleMultisigModel.$signatory)?.accountId).toEqual(keyB.accountId);
  });
});
