import { allSettled, fork } from 'effector';

import {
  type Chain,
  type ChainId,
  type DecodedTransaction,
  type FlexibleMultisigWallet,
  type MultisigWallet,
  type ProxiedWallet,
  AccountType,
  CryptoType,
  ProxyTypes,
  ProxyVariant,
  WalletType,
} from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { VERIFY_PROXY_REMARK_KIND } from '@/shared/transactions';
import { type MultisigOperation, accounts, contactMultisigsModel, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type WalletProxy, isProxyVerifiable, proxiesModel } from '../proxies-model';
import { walletProxiesModel } from '../wallet-proxies-model';

const {
  extractAddProxyArgs,
  extractRemoveProxyArgs,
  extractProxyExecutionArgs,
  findLatestExecutedOperation,
  bucketRank,
} = proxiesModel.__test;

const chainId = '0x01' as ChainId;
const pureProxy = ('0x' + 'aa'.repeat(32)) as AccountId;
const proxyMultisig = ('0x' + 'bb'.repeat(32)) as AccountId;

const decodedTx = (section: string, method: string, args: Record<string, unknown> = {}): DecodedTransaction =>
  ({ section, method, args, chainId, accountId: pureProxy }) as DecodedTransaction;

const makeOp = (overrides: Partial<MultisigOperation> = {}): MultisigOperation =>
  ({
    id: 'op-1',
    status: 'executed',
    transaction: null,
    method: null,
    section: null,
    callHash: '0xcall' as `0x${string}`,
    callData: null,
    chainId,
    multisigAccountId: proxyMultisig,
    proxiedAccountId: pureProxy,
    depositor: proxyMultisig,
    blockCreated: 100 as BlockHeight,
    indexCreated: 0,
    events: [],
    timestamp: 0,
    ...overrides,
  }) as MultisigOperation;

describe('features/wallet-details/model/proxies-model', () => {
  describe('extractAddProxyArgs', () => {
    test('returns null for null/undefined input', () => {
      expect(extractAddProxyArgs(null)).toBeNull();
      expect(extractAddProxyArgs(undefined)).toBeNull();
    });

    test('decodes plain proxy.addProxy', () => {
      const result = extractAddProxyArgs(
        decodedTx('proxy', 'addProxy', {
          delegate: '0xaabb',
          proxyType: ProxyTypes.ANY,
          delay: 0,
        }),
      );

      expect(result).toMatchObject({
        proxyType: ProxyTypes.ANY,
        delay: 0,
      });
      expect(result?.proxy).toBeDefined();
    });

    test('decodes proxy.addProxyWithDelay with a non-zero delay', () => {
      const result = extractAddProxyArgs(
        decodedTx('proxy', 'addProxyWithDelay', {
          delegate: '0xccdd',
          proxyType: ProxyTypes.NON_TRANSFER,
          delay: 42,
        }),
      );

      expect(result).toMatchObject({
        proxyType: ProxyTypes.NON_TRANSFER,
        delay: 42,
      });
    });

    test('unwraps proxy.proxy(proxy.addProxy(...)) via args.transaction', () => {
      const inner = decodedTx('proxy', 'addProxy', {
        delegate: '0xeeff',
        proxyType: ProxyTypes.STAKING,
        delay: 0,
      });
      const outer = decodedTx('proxy', 'proxy', { call: '0xdeadbeef', transaction: inner });

      expect(extractAddProxyArgs(outer)).toMatchObject({
        proxyType: ProxyTypes.STAKING,
        delay: 0,
      });
    });

    test('proxy.proxy wrapping a real-world addProxy (Any, delay 0)', () => {
      const inner = decodedTx('proxy', 'addProxy', {
        delegate: '0x1122',
        proxyType: ProxyTypes.ANY,
        delay: 0,
      });
      const outer = decodedTx('proxy', 'proxy', {
        real: '0xabcd',
        forceProxyType: ProxyTypes.ANY,
        call: '0xdeadbeef',
        transaction: inner,
      });

      expect(extractAddProxyArgs(outer)).toMatchObject({
        proxyType: ProxyTypes.ANY,
        delay: 0,
      });
    });

    test('reads the first element of utility.batch', () => {
      const addProxy = decodedTx('proxy', 'addProxy', {
        delegate: '0x1122',
        proxyType: ProxyTypes.ANY,
        delay: 0,
      });
      const noise = decodedTx('balances', 'transferAllowDeath', {});

      const batch = decodedTx('utility', 'batchAll', { transactions: [addProxy, noise] });
      expect(extractAddProxyArgs(batch)).toMatchObject({ proxyType: ProxyTypes.ANY });
    });

    test('returns null for unrelated transactions', () => {
      expect(extractAddProxyArgs(decodedTx('balances', 'transferKeepAlive'))).toBeNull();
      expect(extractAddProxyArgs(decodedTx('proxy', 'removeProxy'))).toBeNull();
      expect(extractAddProxyArgs(decodedTx('utility', 'batch', { transactions: [] }))).toBeNull();
    });

    test('returns null when addProxy args have the wrong shape', () => {
      expect(extractAddProxyArgs(decodedTx('proxy', 'addProxy', { proxyType: ProxyTypes.ANY, delay: 0 }))).toBeNull();

      expect(extractAddProxyArgs(decodedTx('proxy', 'addProxy', { delegate: '0xaa', delay: 0 }))).toBeNull();
    });
  });

  describe('extractRemoveProxyArgs', () => {
    test('decodes plain proxy.removeProxy', () => {
      expect(
        extractRemoveProxyArgs(
          decodedTx('proxy', 'removeProxy', { delegate: '0xaa', proxyType: ProxyTypes.ANY, delay: 0 }),
        ),
      ).toMatchObject({ proxyType: ProxyTypes.ANY, delay: 0 });
    });

    test('unwraps proxy.proxy(proxy.removeProxy(...)) via args.transaction', () => {
      const inner = decodedTx('proxy', 'removeProxy', {
        delegate: '0xbb',
        proxyType: ProxyTypes.NON_TRANSFER,
        delay: 0,
      });
      const outer = decodedTx('proxy', 'proxy', { call: '0xdead', transaction: inner });
      expect(extractRemoveProxyArgs(outer)).toMatchObject({ proxyType: ProxyTypes.NON_TRANSFER });
    });

    test('returns null for addProxy and for removeProxies (no-args variant)', () => {
      expect(
        extractRemoveProxyArgs(
          decodedTx('proxy', 'addProxy', { delegate: '0xaa', proxyType: ProxyTypes.ANY, delay: 0 }),
        ),
      ).toBeNull();
      expect(extractRemoveProxyArgs(decodedTx('proxy', 'removeProxies', {}))).toBeNull();
    });
  });

  describe('extractProxyExecutionArgs', () => {
    test('decodes proxy.proxy(real, forceProxyType, …) regardless of inner call', () => {
      const remark = decodedTx('system', 'remark', { remark: '0x' });
      const transfer = decodedTx('balances', 'transferKeepAlive', {});

      const withRemark = decodedTx('proxy', 'proxy', {
        real: '0xpure',
        forceProxyType: ProxyTypes.ANY,
        transaction: remark,
      });
      const withTransfer = decodedTx('proxy', 'proxy', {
        real: '0xpure',
        forceProxyType: ProxyTypes.NON_TRANSFER,
        transaction: transfer,
      });

      expect(extractProxyExecutionArgs(withRemark)).toMatchObject({ proxyType: ProxyTypes.ANY });
      expect(extractProxyExecutionArgs(withRemark)?.real).toBeDefined();
      expect(extractProxyExecutionArgs(withTransfer)).toMatchObject({ proxyType: ProxyTypes.NON_TRANSFER });
    });

    test('returns null when outer call is not proxy.proxy', () => {
      const remark = decodedTx('system', 'remark', { remark: '0x' });
      const batch = decodedTx('utility', 'batchAll', { transactions: [remark] });
      expect(extractProxyExecutionArgs(batch)).toBeNull();
      expect(extractProxyExecutionArgs(remark)).toBeNull();
    });

    test('returns null on null/undefined input or missing args', () => {
      expect(extractProxyExecutionArgs(null)).toBeNull();
      expect(extractProxyExecutionArgs(undefined)).toBeNull();

      const remark = decodedTx('system', 'remark', { remark: '0x' });
      const noReal = decodedTx('proxy', 'proxy', { forceProxyType: ProxyTypes.ANY, transaction: remark });
      expect(extractProxyExecutionArgs(noReal)).toBeNull();

      const noProxyType = decodedTx('proxy', 'proxy', { real: '0xpure', transaction: remark });
      expect(extractProxyExecutionArgs(noProxyType)).toBeNull();
    });

    test('unwraps nested proxy.proxy — flex delegates route through their pure before reaching the target', () => {
      const remark = decodedTx('system', 'remark', { remark: '0x' });
      const innerProxy = decodedTx('proxy', 'proxy', {
        real: '0xtarget',
        forceProxyType: ProxyTypes.NON_TRANSFER,
        transaction: remark,
      });
      const outerFlexHop = decodedTx('proxy', 'proxy', {
        real: '0xflexpure',
        forceProxyType: ProxyTypes.ANY,
        transaction: innerProxy,
      });

      expect(extractProxyExecutionArgs(outerFlexHop)).toMatchObject({
        proxyType: ProxyTypes.NON_TRANSFER,
      });
      expect(extractProxyExecutionArgs(outerFlexHop)?.real).toBeDefined();
    });
  });

  describe('findLatestExecutedOperation', () => {
    test('returns null when no operation matches', () => {
      expect(findLatestExecutedOperation([], chainId, pureProxy, proxyMultisig)).toBeNull();

      const ops = [
        makeOp({ status: 'pending' }),
        makeOp({ chainId: '0x02' as ChainId }),
        makeOp({ multisigAccountId: '0xother' as AccountId }),
        makeOp({ proxiedAccountId: '0xotherpure' as AccountId }),
      ];

      expect(findLatestExecutedOperation(ops, chainId, pureProxy, proxyMultisig)).toBeNull();
    });

    test('returns the executed operation with the greatest blockCreated (lenient — any executed op via the proxy combo counts as verified)', () => {
      const ops: MultisigOperation[] = [
        makeOp({ id: 'a', blockCreated: 50 as BlockHeight }),
        makeOp({ id: 'b', blockCreated: 200 as BlockHeight }),
        makeOp({ id: 'c', blockCreated: 150 as BlockHeight }),
      ];

      const latest = findLatestExecutedOperation(ops, chainId, pureProxy, proxyMultisig);
      expect(latest?.id).toBe('b');
    });

    test('ignores non-executed operations even if they are most recent', () => {
      const ops: MultisigOperation[] = [
        makeOp({ id: 'executed-old', blockCreated: 10 as BlockHeight }),
        makeOp({ id: 'pending-new', status: 'pending', blockCreated: 999 as BlockHeight }),
      ];

      expect(findLatestExecutedOperation(ops, chainId, pureProxy, proxyMultisig)?.id).toBe('executed-old');
    });

    test('counts incidental executed ops (plain remark, transfer, etc.) as verification — any successful op proves the proxy works', () => {
      const transfer = decodedTx('proxy', 'proxy', {
        real: pureProxy,
        forceProxyType: ProxyTypes.ANY,
        transaction: { section: 'balances', method: 'transferKeepAlive', chainId, accountId: pureProxy, args: {} },
      });

      const ops: MultisigOperation[] = [makeOp({ id: 'transfer', transaction: transfer })];
      expect(findLatestExecutedOperation(ops, chainId, pureProxy, proxyMultisig)?.id).toBe('transfer');
    });
  });

  describe('isProxyVerifiable', () => {
    test.each([
      [ProxyTypes.ANY, 0, true],
      [ProxyTypes.NON_TRANSFER, 0, true],
      [ProxyTypes.ANY, 1, false], // non-zero delay
      [ProxyTypes.STAKING, 0, false], // unsupported proxy type
      [ProxyTypes.GOVERNANCE, 0, false],
    ] as const)('proxyType=%s delay=%s → %s', (proxyType, delay, expected) => {
      expect(isProxyVerifiable({ proxyType, delay })).toBe(expected);
    });
  });

  describe('bucketRank (display order)', () => {
    const base = {
      id: 'x',
      chainId,
      pureProxyAccountId: pureProxy,
      proxyAccountId: proxyMultisig,
      proxyMultisigAccountId: proxyMultisig,
      proxyWallet: null,
      proxyAccount: null,
      proxyType: ProxyTypes.ANY,
      delay: 0,
      lastOperation: null,
      pendingOperation: null,
      pendingRemovalOperation: null,
      pendingVerificationOperation: null,
    } as const;

    test('pending_addition is the top bucket', () => {
      const pending: WalletProxy = { ...base, status: 'pending_addition', verifiable: false };
      const verifiable: WalletProxy = { ...base, status: 'not_verified', verifiable: true };
      const verified: WalletProxy = { ...base, status: 'verified', verifiable: false };

      expect(bucketRank(pending)).toBeLessThan(bucketRank(verifiable));
      expect(bucketRank(verifiable)).toBeLessThan(bucketRank(verified));
    });

    test('no-wallet sits below verifiable and unverifiable multisig rows', () => {
      const noWallet: WalletProxy = { ...base, status: 'not_verified_no_wallet', verifiable: false };
      const verifiable: WalletProxy = { ...base, status: 'not_verified', verifiable: true };

      expect(bucketRank(verifiable)).toBeLessThan(bucketRank(noWallet));
    });
  });

  describe('$proxies pending verification stamping (PW vs FMW parity)', () => {
    const F = ('0x' + 'aa'.repeat(32)) as AccountId;
    const M = ('0x' + 'bb'.repeat(32)) as AccountId;
    const verifyChainId = '0x01' as ChainId;

    const chain = {
      chainId: verifyChainId,
      assets: [{ assetId: 0 }],
      options: ['multisig', 'proxy'],
    } as unknown as Chain;

    const pwAccount = {
      id: 'pw-acc',
      walletId: 1,
      type: 'chain',
      accountType: AccountType.PROXIED,
      accountId: F,
      chainId: verifyChainId,
      connections: [{ proxyAccountId: M, proxyType: ProxyTypes.ANY, delay: 0 }],
      proxyVariant: ProxyVariant.PURE,
    } as any;

    const fmwAccount = {
      id: 'fmw-acc',
      walletId: 2,
      type: 'chain',
      accountType: AccountType.FLEX_MULTISIG,
      accountId: F,
      chainId: verifyChainId,
      multisigAccountId: M,
      signatories: [{ accountId: '0xsig1' }, { accountId: '0xsig2' }],
      threshold: 2,
      proxyType: ProxyTypes.ANY,
    } as any;

    const mwAccount = {
      id: 'mw-acc',
      walletId: 3,
      type: 'universal',
      accountType: AccountType.MULTISIG,
      accountId: M,
      signatories: [{ accountId: '0xsig1' }, { accountId: '0xsig2' }],
      threshold: 2,
    } as any;

    const pwWallet = {
      id: 1,
      name: 'PW',
      type: WalletType.PROXIED,
      isHidden: false,
      accounts: [pwAccount],
    } as unknown as ProxiedWallet;
    const fmwWallet = {
      id: 2,
      name: 'FMW',
      type: WalletType.FLEXIBLE_MULTISIG,
      isHidden: false,
      accounts: [fmwAccount],
    } as unknown as FlexibleMultisigWallet;
    const mwWallet = {
      id: 3,
      name: 'MW',
      type: WalletType.MULTISIG,
      isHidden: false,
      accounts: [mwAccount],
    } as unknown as MultisigWallet;

    const verifyMarkerInner = (delegate: AccountId, pure: AccountId) => ({
      section: 'system',
      method: 'remarkWithEvent',
      chainId: verifyChainId,
      accountId: pure,
      args: {
        remark: JSON.stringify({
          kind: VERIFY_PROXY_REMARK_KIND,
          delegateAccountId: delegate,
          pureProxyAccountId: pure,
        }),
      },
    });

    const buildVerifyTx = (delegate: AccountId, pure: AccountId) => ({
      section: 'proxy',
      method: 'proxy',
      chainId: verifyChainId,
      accountId: delegate,
      args: {
        real: pure,
        forceProxyType: ProxyTypes.ANY,
        transaction: verifyMarkerInner(delegate, pure),
      },
    });

    const verifyOp = {
      id: 'op-verify',
      status: 'pending',
      chainId: verifyChainId,
      multisigAccountId: M,
      proxiedAccountId: F,
      callHash: '0xverifycall',
      blockCreated: 200,
      indexCreated: 0,
      timestamp: 0,
      events: [],
      transaction: buildVerifyTx(M, F),
    } as unknown as MultisigOperation;

    const walletProxiesData = {
      [verifyChainId]: {
        proxies: [{ accountId: M, proxiedAccountId: F, chainId: verifyChainId, proxyType: ProxyTypes.ANY, delay: 0 }],
        deposit: null,
      },
    };

    const baseValues = () =>
      new Map<any, any>([
        [walletModel.__test.$rawWallets, [pwWallet, fmwWallet, mwWallet]],
        [accounts.__test.$list, [pwAccount, fmwAccount, mwAccount]],
        [networkModel.$chains, { [verifyChainId]: chain }],
        [walletProxiesModel.$walletProxies, walletProxiesData],
        [multisigOperation.__test.$cachedOperations, [verifyOp]],
      ]);

    const setupScope = async (gateWallet: ProxiedWallet | FlexibleMultisigWallet) => {
      const scope = fork({ values: baseValues() });
      await allSettled(walletProxiesModel.flow.open, { scope, params: { wallet: gateWallet } });
      return scope;
    };

    test('Proxied wallet view stamps pendingVerificationOperation', async () => {
      const scope = await setupScope(pwWallet);
      const proxies = scope.getState(proxiesModel.$proxies);

      expect(proxies).toHaveLength(1);
      expect(proxies[0]?.pendingVerificationOperation).not.toBeNull();
      expect(proxies[0]?.pendingVerificationOperation?.operationId).toBe('op-verify');
    });

    test('Flexible Multisig wallet view stamps pendingVerificationOperation', async () => {
      const scope = await setupScope(fmwWallet);
      const proxies = scope.getState(proxiesModel.$proxies);

      expect(proxies).toHaveLength(1);
      expect(proxies[0]?.pendingVerificationOperation).not.toBeNull();
      expect(proxies[0]?.pendingVerificationOperation?.operationId).toBe('op-verify');
    });

    test('Proxied wallet view detects verification when only Flex Multisig represents M (no standalone Multisig)', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [walletModel.__test.$rawWallets, [pwWallet, fmwWallet]],
          [accounts.__test.$list, [pwAccount, fmwAccount]],
          [networkModel.$chains, { [verifyChainId]: chain }],
          [walletProxiesModel.$walletProxies, walletProxiesData],
          [multisigOperation.__test.$cachedOperations, [verifyOp]],
        ]),
      });
      await allSettled(walletProxiesModel.flow.open, { scope, params: { wallet: pwWallet } });
      const proxies = scope.getState(proxiesModel.$proxies);

      expect(proxies).toHaveLength(1);
      expect(proxies[0]?.pendingVerificationOperation).not.toBeNull();
    });

    test('Flex Multisig view detects verification when only Flex represents M (no standalone Multisig)', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [walletModel.__test.$rawWallets, [pwWallet, fmwWallet]],
          [accounts.__test.$list, [pwAccount, fmwAccount]],
          [networkModel.$chains, { [verifyChainId]: chain }],
          [walletProxiesModel.$walletProxies, walletProxiesData],
          [multisigOperation.__test.$cachedOperations, [verifyOp]],
        ]),
      });
      await allSettled(walletProxiesModel.flow.open, { scope, params: { wallet: fmwWallet } });
      const proxies = scope.getState(proxiesModel.$proxies);

      expect(proxies).toHaveLength(1);
      expect(proxies[0]?.pendingVerificationOperation).not.toBeNull();
    });

    test('does NOT stamp pendingVerificationOperation for incidental pending proxy.proxy ops (e.g. a transfer routed through the proxy)', async () => {
      const transferOp = {
        id: 'op-transfer',
        status: 'pending',
        chainId: verifyChainId,
        multisigAccountId: M,
        proxiedAccountId: F,
        callHash: '0xtransfer',
        blockCreated: 210,
        indexCreated: 0,
        timestamp: 0,
        events: [],
        transaction: {
          section: 'proxy',
          method: 'proxy',
          chainId: verifyChainId,
          accountId: M,
          args: {
            real: F,
            forceProxyType: ProxyTypes.ANY,
            transaction: {
              section: 'balances',
              method: 'transferKeepAlive',
              chainId: verifyChainId,
              accountId: F,
              args: { dest: ('0x' + 'ee'.repeat(32)) as AccountId, value: '1000' },
            },
          },
        },
      } as unknown as MultisigOperation;

      const scope = fork({
        values: new Map<any, any>([
          [walletModel.__test.$rawWallets, [pwWallet, fmwWallet, mwWallet]],
          [accounts.__test.$list, [pwAccount, fmwAccount, mwAccount]],
          [networkModel.$chains, { [verifyChainId]: chain }],
          [walletProxiesModel.$walletProxies, walletProxiesData],
          [multisigOperation.__test.$cachedOperations, [transferOp]],
        ]),
      });
      await allSettled(walletProxiesModel.flow.open, { scope, params: { wallet: pwWallet } });
      const proxies = scope.getState(proxiesModel.$proxies);

      expect(proxies).toHaveLength(1);
      expect(proxies[0]?.pendingVerificationOperation).toBeNull();
    });

    test('Flex Multisig view detects verification op signed by an additional multisig proxy', async () => {
      const M2 = ('0x' + 'cc'.repeat(32)) as AccountId;
      const mw2Account = {
        id: 'mw2-acc',
        walletId: 4,
        type: 'universal',
        accountType: AccountType.MULTISIG,
        accountId: M2,
        signatories: [{ accountId: '0xsig3' }, { accountId: '0xsig4' }],
        threshold: 2,
      } as any;
      const mw2Wallet = {
        id: 4,
        name: 'MW2',
        type: WalletType.MULTISIG,
        isHidden: false,
        accounts: [mw2Account],
      } as unknown as MultisigWallet;

      const verifyOpFromM2 = {
        ...verifyOp,
        id: 'op-verify-m2',
        multisigAccountId: M2,
        transaction: buildVerifyTx(M2, F),
      } as unknown as MultisigOperation;

      const walletProxiesWithExtra = {
        [verifyChainId]: {
          proxies: [
            { accountId: M, proxiedAccountId: F, chainId: verifyChainId, proxyType: ProxyTypes.ANY, delay: 0 },
            { accountId: M2, proxiedAccountId: F, chainId: verifyChainId, proxyType: ProxyTypes.ANY, delay: 0 },
          ],
          deposit: null,
        },
      };

      const scope = fork({
        values: new Map<any, any>([
          [walletModel.__test.$rawWallets, [fmwWallet, mwWallet, mw2Wallet]],
          [accounts.__test.$list, [fmwAccount, mwAccount, mw2Account]],
          [networkModel.$chains, { [verifyChainId]: chain }],
          [walletProxiesModel.$walletProxies, walletProxiesWithExtra],
          [multisigOperation.__test.$cachedOperations, [verifyOpFromM2]],
        ]),
      });
      await allSettled(walletProxiesModel.flow.open, { scope, params: { wallet: fmwWallet } });
      const proxies = scope.getState(proxiesModel.$proxies);

      expect(proxies).toHaveLength(2);
      const m2Row = proxies.find(p => p.proxyAccountId === M2);
      expect(m2Row?.pendingVerificationOperation?.operationId).toBe('op-verify-m2');
    });

    test('Proxied wallet view treats address-book-only multisig proxy as multisig', async () => {
      const M2 = ('0x' + 'cc'.repeat(32)) as AccountId;
      const walletProxiesWithExternal = {
        [verifyChainId]: {
          proxies: [
            { accountId: M2, proxiedAccountId: F, chainId: verifyChainId, proxyType: ProxyTypes.ANY, delay: 0 },
          ],
          deposit: null,
        },
      };

      const scope = fork({
        values: new Map<any, any>([
          [walletModel.__test.$rawWallets, [pwWallet]],
          [accounts.__test.$list, [pwAccount]],
          [
            contactMultisigsModel.$contactMultisigs,
            [
              {
                accountId: M2,
                name: 'External multisig',
                signatories: ['0xsig3' as AccountId, '0xsig4' as AccountId],
                threshold: 2,
                cryptoType: CryptoType.SR25519,
                contactIds: ['contact-1'],
              },
            ],
          ],
          [networkModel.$chains, { [verifyChainId]: chain }],
          [walletProxiesModel.$walletProxies, walletProxiesWithExternal],
          [multisigOperation.__test.$cachedOperations, []],
        ]),
      });
      await allSettled(walletProxiesModel.flow.open, { scope, params: { wallet: pwWallet } });
      const proxies = scope.getState(proxiesModel.$proxies);

      expect(proxies).toHaveLength(1);
      expect(proxies[0]?.proxyMultisigAccountId).toBe(M2);
      expect(proxies[0]?.status).toBe('not_verified_no_wallet');
      expect(proxies[0]?.verifiable).toBe(false);
    });
  });
});
