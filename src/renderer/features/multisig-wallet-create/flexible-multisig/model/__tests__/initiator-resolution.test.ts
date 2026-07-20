import { allSettled, fork } from 'effector';
import { describe, expect, test } from 'vitest';

import { type Wallet, ConnectionStatus, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import * as networkDomain from '@/domains/network';
import { type AnyAccount, type ChainAccount, accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { flexibleMultisigModel } from '../flexible-multisig-create';
import { formModel } from '../form-model';
import { signatoryModel } from '../signatory-model';

import { testApi, testChain } from './mock';

const makeKey = (id: string, seed: string): AnyAccount => ({
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

// The DI anyOf registries (accountAvailabilityOnChainAnyOf, accountActionPermissionAnyOf) and the
// accountCollectChildrenPipeline register handlers through unscoped events at module import. The
// stores under test here (`$initiator`, `$signatory`) are derived via `combine`, which under
// `fork()` reads those registries through the *scoped* `getState()` — an unscoped registerHandler()
// call never reaches that scope registry, so every availability/graph check would silently resolve
// to `false`/empty. Registering the stub handlers inside the scope (via allSettled) is the
// established fix — see tests/integrations/utils/framework/seedAccountHandlers.ts.
const makeScope = async (wallets: Wallet[], accounts: AnyAccount[]) => {
  const scope = fork({
    values: new Map()
      .set(networkModel.$apis, { [testChain.chainId]: testApi })
      .set(networkModel.$chains, { [testChain.chainId]: testChain })
      .set(networkModel.$connectionStatuses, { [testChain.chainId]: ConnectionStatus.CONNECTED })
      .set(walletModel.__test.$rawWallets, wallets)
      .set(networkDomain.accounts.__test.$list, accounts),
  });

  await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
    scope,
    params: {
      body: ({ account, chain }: { account: AnyAccount; chain: typeof testChain }) =>
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
  await allSettled(accountService.accountCollectChildrenPipeline.registerHandler, {
    scope,
    params: {
      body(children: AnyAccount[], { account, accounts }: { account: AnyAccount; accounts: AnyAccount[] }) {
        if ('proxiedAccountId' in account) {
          return accounts.filter(a => a.accountId === account.proxiedAccountId);
        }
        return children;
      },
      available: () => true,
    },
  });

  await allSettled(formModel.form.fields.chainId.change, { scope, params: testChain.chainId });

  return scope;
};

describe('flexible multisig initiator resolution', () => {
  test.each([
    { picked: keyA, other: keyB },
    { picked: keyB, other: keyA },
  ])('initiator is the key selected as signatory ($picked.id), not array order', async ({ picked, other }) => {
    const scope = await makeScope([vaultWallet], [keyA, keyB]);

    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'PTL Keys', address: toAddress(picked.accountId), walletId: '1' },
    });

    expect(scope.getState(flexibleMultisigModel.$initiator)?.accountId).toEqual(picked.accountId);
    expect(scope.getState(flexibleMultisigModel.$initiator)?.accountId).not.toEqual(other.accountId);
  });

  test('non-key-set wallet: initiator resolves to the wallet single account', async () => {
    const soloAccount: ChainAccount = {
      id: 'solo',
      type: 'chain',
      name: 'Solo Signer',
      walletId: 2,
      chainId: testChain.chainId,
      accountId: createAccountId('solo-seed'),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WALLET_CONNECT,
      createdAt: Date.now(),
    };
    const soloWallet: Wallet = {
      id: 2,
      name: 'Solo Wallet',
      type: WalletType.WALLET_CONNECT,
      accounts: [soloAccount],
    } as Wallet;

    const scope = await makeScope([soloWallet], [soloAccount]);

    await allSettled(signatoryModel.events.changeSignatory, {
      scope,
      params: { index: 0, name: 'Solo Wallet', address: toAddress(soloAccount.accountId), walletId: '2' },
    });

    expect(scope.getState(flexibleMultisigModel.$initiator)?.accountId).toEqual(soloAccount.accountId);
  });

  describe('explicit signer selection vs. derived default', () => {
    // A single leaf key's signatory list is always `[itself]`, so picking it can never exercise
    // the "selected pick beats array order" branch of `$signatory` — both branches would return the
    // same value even if the combine ignored the selection entirely. To exercise the branch for
    // real, the initiator here is a proxy-shaped account whose accountCollectChildrenPipeline
    // children are TWO distinct leaf signatories (mirrors the "should find signatories" case in
    // domains/network/account/service.test.ts), so `$signatories` has 2 entries with a
    // deterministic, non-selected entry at index 0.
    interface ProxyLikeAccount extends ChainAccount {
      proxiedAccountId: AccountId;
    }

    const sharedAccountId = createAccountId('shared-signatory-pool');

    const proxyInitiator: ProxyLikeAccount = {
      id: 'proxy-initiator',
      type: 'chain',
      name: 'Proxy Initiator',
      walletId: 1,
      chainId: testChain.chainId,
      accountId: createAccountId('proxy-initiator-seed'),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.POLKADOT_VAULT,
      createdAt: Date.now(),
      proxiedAccountId: sharedAccountId,
    };

    const leafX: ChainAccount = {
      id: 'leaf-x',
      type: 'chain',
      name: 'Leaf X',
      walletId: 3,
      chainId: testChain.chainId,
      accountId: sharedAccountId,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WALLET_CONNECT,
      createdAt: Date.now(),
    };

    const leafY: ChainAccount = {
      id: 'leaf-y',
      type: 'chain',
      name: 'Leaf Y',
      walletId: 4,
      chainId: testChain.chainId,
      accountId: sharedAccountId,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.EXTENSION,
      createdAt: Date.now(),
    };

    const initiatorWallet: Wallet = {
      id: 1,
      name: 'PTL Keys',
      type: WalletType.POLKADOT_VAULT,
      accounts: [proxyInitiator],
    } as Wallet;

    const selectProxyInitiator = async (scope: Awaited<ReturnType<typeof makeScope>>) => {
      await allSettled(signatoryModel.events.changeSignatory, {
        scope,
        params: { index: 0, name: 'Proxy Initiator', address: toAddress(proxyInitiator.accountId), walletId: '1' },
      });
    };

    test('without an explicit pick, $signatory defaults to signatories[0]', async () => {
      const scope = await makeScope([initiatorWallet], [proxyInitiator, leafX, leafY]);
      await selectProxyInitiator(scope);

      expect(scope.getState(flexibleMultisigModel.$signatory)?.id).toEqual(leafX.id);
    });

    test('an explicit pick that is not signatories[0] wins over the derived default', async () => {
      const scope = await makeScope([initiatorWallet], [proxyInitiator, leafX, leafY]);
      await selectProxyInitiator(scope);
      await allSettled(flexibleMultisigModel.signatorySelected, { scope, params: leafY });

      expect(scope.getState(flexibleMultisigModel.$signatory)?.id).toEqual(leafY.id);
      expect(scope.getState(flexibleMultisigModel.$signatory)?.id).not.toEqual(leafX.id);
    });
  });
});
