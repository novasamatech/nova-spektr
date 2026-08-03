import { allSettled, fork } from 'effector';
import { describe, expect, test } from 'vitest';

import { type ChainId, type Wallet, CryptoType, SigningType, TransactionType, WalletType } from '@/shared/core';
import { ProxyTypes } from '@/shared/core/types/proxy';
import { createAccountId, polkadotChain } from '@/shared/mocks';
import { VERIFY_PROXY_REMARK_KIND, parseVerifyProxyMarker } from '@/shared/transactions';
import { type AnyAccount, type ChainAccount, accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { type VerifyProxyRef, Step, verifyProxyModel } from '../verify-proxy-model';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const delegateAccount: ChainAccount = {
  id: 'delegate-1',
  type: 'chain',
  name: 'Delegate',
  walletId: 1,
  chainId: polkadotChain.chainId,
  accountId: createAccountId('verify-delegate'),
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WALLET_CONNECT,
  createdAt: Date.now(),
};

const delegateWallet: Wallet = {
  id: 1,
  name: 'Delegate Wallet',
  type: WalletType.WALLET_CONNECT,
  accounts: [delegateAccount],
} as Wallet;

const pureProxyAccountId = createAccountId('verify-pure-proxy');

const buildProxyRef = (overrides: Partial<VerifyProxyRef> = {}): VerifyProxyRef => ({
  id: 'proxy-row-1',
  chainId: polkadotChain.chainId,
  pureProxyAccountId,
  proxyAccountId: delegateAccount.accountId,
  proxyType: ProxyTypes.ANY,
  delay: 0,
  ...overrides,
});

// The DI anyOf registries register handlers through unscoped events at module import;
// combines/samples under fork() read them through the scoped getState(), so
// availability/permission checks silently resolve to false unless the stubs are
// registered inside the scope (mirrors initiator-resolution.test.ts).
const makeScope = async ({ accountsList = [delegateAccount] }: { accountsList?: AnyAccount[] } = {}) => {
  const scope = fork({
    values: new Map()
      .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
      .set(accounts.__test.$list, accountsList),
  });

  await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
    scope,
    params: {
      body: ({ account, chain }: { account: AnyAccount; chain: typeof polkadotChain }) =>
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

const startFlow = (scope: Awaited<ReturnType<typeof makeScope>>, proxy: VerifyProxyRef) => {
  return allSettled(verifyProxyModel.events.flowStarted, { scope, params: { wallet: delegateWallet, proxy } });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('features/proxy-verify verify-proxy-model', () => {
  describe('flow init → form state', () => {
    test.each([ProxyTypes.ANY, ProxyTypes.NON_TRANSFER])(
      'verifiable proxy type %s resolves the store and enters INIT',
      async (proxyType) => {
        const scope = await makeScope();
        await startFlow(scope, buildProxyRef({ proxyType }));

        expect(scope.getState(verifyProxyModel.$step)).toBe(Step.INIT);
        expect(scope.getState(verifyProxyModel.$lastGuardFailure)).toBeNull();
        expect(scope.getState(verifyProxyModel.$activeProxyId)).toBe('proxy-row-1');

        const store = scope.getState(verifyProxyModel.$verifyStore);
        expect(store?.chain.chainId).toBe(polkadotChain.chainId);
        expect(store?.initiator).toBe(delegateAccount);
        expect(store?.proxy.proxyType).toBe(proxyType);

        // the single available signatory (the delegate itself) is picked into the form
        expect(scope.getState(verifyProxyModel.$signatories)).toEqual([delegateAccount]);
        expect(scope.getState(verifyProxyModel.form.fields.signatory.$value)).toBe(delegateAccount);
      },
    );

    test('non-verifiable proxy type is rejected by the guard and never reaches the form', async () => {
      const scope = await makeScope();
      await startFlow(scope, buildProxyRef({ proxyType: ProxyTypes.STAKING }));

      expect(scope.getState(verifyProxyModel.$lastGuardFailure)).toBe('proxy_type_restricted');
      expect(scope.getState(verifyProxyModel.$step)).toBe(Step.NONE);
      expect(scope.getState(verifyProxyModel.$verifyStore)).toBeNull();
      expect(scope.getState(verifyProxyModel.$activeProxyId)).toBeNull();
      expect(scope.getState(verifyProxyModel.$coreTx)).toBeNull();
    });

    test.each([
      { overrides: { delay: 5 }, reason: 'delay_nonzero' },
      { overrides: { chainId: '0xdead' as ChainId }, reason: 'chain_missing' },
    ])('guard rejects with $reason', async ({ overrides, reason }) => {
      const scope = await makeScope();
      await startFlow(scope, buildProxyRef(overrides));

      expect(scope.getState(verifyProxyModel.$lastGuardFailure)).toBe(reason);
      expect(scope.getState(verifyProxyModel.$verifyStore)).toBeNull();
    });

    test('guard rejects when the delegate account is not loaded locally', async () => {
      const scope = await makeScope({ accountsList: [] });
      await startFlow(scope, buildProxyRef());

      expect(scope.getState(verifyProxyModel.$lastGuardFailure)).toBe('delegate_account_not_loaded');
      expect(scope.getState(verifyProxyModel.$verifyStore)).toBeNull();
    });
  });

  describe('$coreTx shape', () => {
    test('builds proxy.proxy(real=pure, forceProxyType, system.remarkWithEvent(marker))', async () => {
      const scope = await makeScope();
      await startFlow(scope, buildProxyRef({ proxyType: ProxyTypes.NON_TRANSFER }));

      const coreTx = scope.getState(verifyProxyModel.$coreTx);
      expect(coreTx?.type).toBe(TransactionType.PROXY);
      expect(coreTx?.chainId).toBe(polkadotChain.chainId);
      // dispatched by the clicked delegate on behalf of the pure proxy
      expect(coreTx?.accountId).toBe(delegateAccount.accountId);
      expect(coreTx?.args['real']).toBe(pureProxyAccountId);
      expect(coreTx?.args['forceProxyType']).toBe(ProxyTypes.NON_TRANSFER);

      const innerTx = coreTx?.args['transaction'];
      expect(innerTx?.type).toBe(TransactionType.REMARK_WITH_EVENT);
      expect(innerTx?.accountId).toBe(pureProxyAccountId);
    });

    test('marker payload carries delegateAccountId and pureProxyAccountId per the codec', async () => {
      const scope = await makeScope();
      await startFlow(scope, buildProxyRef());

      const coreTx = scope.getState(verifyProxyModel.$coreTx);
      const marker = parseVerifyProxyMarker(coreTx?.args['transaction'].args['remark']);

      expect(marker).toEqual({
        kind: VERIFY_PROXY_REMARK_KIND,
        delegateAccountId: delegateAccount.accountId,
        pureProxyAccountId,
      });

      // the info-popover preview is built by the same helper, so it cannot drift
      expect(scope.getState(verifyProxyModel.$remarkPayload)).toEqual({
        kind: VERIFY_PROXY_REMARK_KIND,
        delegateAccountId: delegateAccount.accountId,
        pureProxyAccountId,
      });
    });

    test('user remark text is embedded into the marker payload', async () => {
      const scope = await makeScope();
      await startFlow(scope, buildProxyRef());

      await allSettled(verifyProxyModel.form.fields.remark.change, { scope, params: 'annual audit' });

      const coreTx = scope.getState(verifyProxyModel.$coreTx);
      const marker = parseVerifyProxyMarker(coreTx?.args['transaction'].args['remark']);
      expect(marker?.remark).toBe('annual audit');
      expect(scope.getState(verifyProxyModel.$remarkPayload)?.remark).toBe('annual audit');
    });
  });
});
