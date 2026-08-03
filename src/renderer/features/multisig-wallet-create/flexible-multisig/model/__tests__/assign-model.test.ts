import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { allSettled, fork } from 'effector';
import { describe, expect, test, vi } from 'vitest';

import { type Wallet, ConnectionStatus, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, polkadotChain } from '@/shared/mocks';
import * as networkDomain from '@/domains/network';
import { type AnyAccount, type ChainAccount, accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type SuccessResult, ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { walletsModel } from '@/features/proxied-wallet';
import { assignModel } from '../assign-model';
import { flexibleMultisigFeature } from '../feature';
import { formModel } from '../form-model';
import { signatoryModel } from '../signatory-model';

// The fake ApiPromise below carries only pallet consts — `getExtrinsic[type](args, api)`
// (evaluated eagerly in $fakeProxyExtrinsic / createComplexTxStore combines) would throw
// on it. Null extrinsics keep the fee machinery inert; the transaction builders and the
// wallet-creation payloads under test stay real.
vi.mock('@/entities/transaction', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();

  return {
    ...actual,
    getExtrinsic: new Proxy({}, { get: () => () => null }),
  };
});

const testApi = {
  consts: {
    proxy: {
      proxyDepositBase: new BN(1000),
      proxyDepositFactor: new BN(10),
    },
    multisig: {
      depositBase: new BN(100),
      depositFactor: new BN(5),
    },
    balances: {
      existentialDeposit: { toBn: () => new BN(1) },
    },
  },
} as unknown as ApiPromise;

const soloAccount: ChainAccount = {
  id: 'solo',
  type: 'chain',
  name: 'Solo Signer',
  walletId: 2,
  chainId: polkadotChain.chainId,
  accountId: createAccountId('solo-signer'),
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

const secondSignatoryAddress = toAddress(createAccountId('second-signatory'));

const pureCreated = {
  accountId: createAccountId('pure-proxy-account'),
  entropyBlockNumber: 111,
  extrinsicIndex: 3,
  pendingBlockNumber: 222,
};

// The block the indexer must pass before account-sync may evict the in-flight
// wallet — both write sites must stamp it from the submit timepoint.
const submitTimepoint = { height: 4242, index: 7 };

const submitSuccessResult: SuccessResult[] = [
  {
    id: 0,
    result: ExtrinsicResult.SUCCESS,
    params: {
      timepoint: submitTimepoint,
      signature: '0x00',
      extrinsicHash: '0x00',
      isFinalApprove: true,
      multisigError: '',
      proxyError: '',
    },
  },
];

// DI anyOf/pipeline registries are registered through unscoped events at module import,
// so combines under fork() would resolve every availability/permission check to
// false/empty. Register the stubs in-scope — same approach as the neighbouring
// initiator-resolution.test.ts.
const makeScope = async (createWalletMock: ReturnType<typeof vi.fn>) => {
  const scope = fork({
    values: new Map()
      .set(networkModel.$apis, { [polkadotChain.chainId]: testApi })
      .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
      .set(networkModel.$connectionStatuses, { [polkadotChain.chainId]: ConnectionStatus.CONNECTED })
      .set(walletModel.__test.$rawWallets, [soloWallet])
      .set(networkDomain.accounts.__test.$list, [soloAccount])
      .set(assignModel.$pureCreated, pureCreated),
    // Map<any, any> mirrors the handlers-map convention in
    // domains/network/multisig-operation/store.test.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlers: new Map<any, any>([
      [walletModel.createWallet, createWalletMock],
      [walletsModel.subscribePureEventFx, vi.fn()],
    ]),
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

  // form + feature: chain, name, threshold, two signatories (row 0 = paying account)
  await allSettled(formModel.form.fields.chainId.change, { scope, params: polkadotChain.chainId });
  await allSettled(flexibleMultisigFeature.start, { scope });

  await allSettled(signatoryModel.events.changeSignatory, {
    scope,
    params: { index: 0, name: 'Solo Signer', address: toAddress(soloAccount.accountId), walletId: '2' },
  });
  await allSettled(signatoryModel.events.changeSignatory, {
    scope,
    params: { index: 1, name: 'Second Signatory', address: secondSignatoryAddress },
  });
  await allSettled(formModel.form.fields.name.change, { scope, params: 'My Flexible' });
  await allSettled(formModel.form.fields.threshold.change, { scope, params: 2 });

  return scope;
};

type CreateWalletParams = {
  wallet: { type: WalletType };
  accounts: Record<string, unknown>[];
};

const findCallByWalletType = (mock: ReturnType<typeof vi.fn>, type: WalletType) => {
  const calls: CreateWalletParams[] = mock.mock.calls.map(([params]) => params);

  return calls.find(params => params.wallet.type === type);
};

describe('flexible multisig assign-model', () => {
  test('stamps pendingBlockNumber from the submit timepoint on the flexible multisig account', async () => {
    const createWalletMock = vi.fn().mockResolvedValue(undefined);
    const scope = await makeScope(createWalletMock);

    await allSettled(submitModel.done, { scope, params: submitSuccessResult });

    const flexibleCall = findCallByWalletType(createWalletMock, WalletType.FLEXIBLE_MULTISIG);
    expect(flexibleCall).toBeDefined();

    const flexibleAccount = flexibleCall!.accounts.at(0)!;
    // the in-flight wallet survives account-sync until the indexer passes this block
    expect(flexibleAccount['pendingBlockNumber']).toBe(submitTimepoint.height);
    expect(flexibleAccount['extrinsicIndex']).toBe(submitTimepoint.index);
    // provenance of the pure proxy stays with the subscription result, not the timepoint
    expect(flexibleAccount['accountId']).toBe(pureCreated.accountId);
    expect(flexibleAccount['entropyBlockNumber']).toBe(pureCreated.entropyBlockNumber);
  });

  test('stamps pendingBlockNumber from the submit timepoint on the sister pure-proxied account', async () => {
    const createWalletMock = vi.fn().mockResolvedValue(undefined);
    const scope = await makeScope(createWalletMock);

    await allSettled(submitModel.done, { scope, params: submitSuccessResult });

    const proxiedCall = findCallByWalletType(createWalletMock, WalletType.PROXIED);
    expect(proxiedCall).toBeDefined();

    const proxiedAccount = proxiedCall!.accounts.at(0)!;
    expect(proxiedAccount['pendingBlockNumber']).toBe(submitTimepoint.height);
    expect(proxiedAccount['extrinsicIndex']).toBe(submitTimepoint.index);
    expect(proxiedAccount['accountId']).toBe(pureCreated.accountId);
    expect(proxiedAccount['entropyBlockNumber']).toBe(pureCreated.entropyBlockNumber);
  });

  test('a single successful submit creates flexible, proxied and plain multisig wallets', async () => {
    const createWalletMock = vi.fn().mockResolvedValue(undefined);
    const scope = await makeScope(createWalletMock);

    await allSettled(submitModel.done, { scope, params: submitSuccessResult });

    expect(createWalletMock).toHaveBeenCalledTimes(3);
    const types = createWalletMock.mock.calls.map(([params]) => (params as CreateWalletParams).wallet.type);
    expect(types).toEqual(
      expect.arrayContaining([WalletType.FLEXIBLE_MULTISIG, WalletType.PROXIED, WalletType.MULTISIG]),
    );

    // sanity: the success marker flips; it gates the flexible-wallet creation sample (assign-model.ts $flexibleMultisigCreated filter)
    expect(scope.getState(assignModel.$flexibleMultisigCreated)).toBe(true);
  });
});
