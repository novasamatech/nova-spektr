import { type ApiPromise } from '@polkadot/api';
import { type Scope, allSettled, createWatch, fork } from 'effector';

import { type Chain, type ChainId, type Stake, type Wallet, CryptoType, SigningType, WalletType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { AssetHubChains, era, exposures, nominations, staking } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { stakingPositions } from '../model';

// The staking domain talks to the chain through five service modules. Mocking
// exactly those keeps the pooled resources, their caches and the refcounting
// real - only the api reads are replaced.
const chainMock = vi.hoisted(() => {
  type Callback<T> = (value: T) => void;

  const ledgers = new Map<string, Callback<Record<string, unknown>>>();
  const nominations = new Map<string, Callback<Record<string, unknown>>>();
  const minBonds = new Map<string, Callback<string>>();
  const eras = new Map<string, Callback<number | undefined>>();

  const exposurePages: Record<string, Record<string, unknown>> = {};
  const validators: Record<string, Record<string, unknown>> = {};

  const reset = () => {
    ledgers.clear();
    nominations.clear();
    minBonds.clear();
    eras.clear();

    for (const key of Object.keys(exposurePages)) delete exposurePages[key];
    for (const key of Object.keys(validators)) delete validators[key];
  };

  return { ledgers, nominations, minBonds, eras, exposurePages, validators, reset };
});

vi.mock('@/domains/staking/staking/service', () => ({
  subscribeStaking: (chainId: string, _api: unknown, _accounts: unknown, callback: never) => {
    chainMock.ledgers.set(chainId, callback);

    return Promise.resolve(() => chainMock.ledgers.delete(chainId));
  },
  stakingService: {},
}));

vi.mock('@/domains/staking/nominations/service', () => ({
  nominationsService: {
    subscribeNominations: (api: { chainId: string }, _stashes: unknown, callback: never) => {
      chainMock.nominations.set(api.chainId, callback);

      return Promise.resolve(() => chainMock.nominations.delete(api.chainId));
    },
    subscribeMinNominatorBond: (api: { chainId: string }, callback: never) => {
      chainMock.minBonds.set(api.chainId, callback);

      return Promise.resolve(() => chainMock.minBonds.delete(api.chainId));
    },
    subscribePayee: () => Promise.resolve(() => {}),
  },
}));

vi.mock('@/domains/staking/era/service', () => ({
  eraService: {
    subscribeActiveEra: (api: { chainId: string }, callback: never) => {
      chainMock.eras.set(api.chainId, callback);

      return Promise.resolve(() => chainMock.eras.delete(api.chainId));
    },
    getEraStart: () => Promise.resolve(null),
  },
}));

vi.mock('@/domains/staking/exposures/service', () => ({
  exposureService: {
    getEraOverviews: () => Promise.resolve({}),
    getExposurePages: (api: { chainId: string }) => Promise.resolve(chainMock.exposurePages[api.chainId] ?? {}),
  },
}));

vi.mock('@/domains/staking/validators/service', () => ({
  validatorsService: {
    getEraValidators: ({ chainId }: { chainId: string }) => Promise.resolve(chainMock.validators[chainId] ?? {}),
    getNominators: () => Promise.resolve({}),
  },
}));

// --- Fixtures ---

const POLKADOT_AH = AssetHubChains.POLKADOT_AH;
const KUSAMA_AH = AssetHubChains.KUSAMA_AH;
const WESTEND_AH = AssetHubChains.WESTEND_AH;

function createChain(chainId: ChainId, name: string): Chain {
  return {
    chainId,
    name,
    specName: name.toLowerCase(),
    assets: [],
    nodes: [],
    icon: '',
    addressPrefix: 0,
  };
}

const polkadotChain = createChain(POLKADOT_AH, 'Polkadot Asset Hub');
const kusamaChain = createChain(KUSAMA_AH, 'Kusama Asset Hub');
const westendChain = createChain(WESTEND_AH, 'Westend Asset Hub');

function createApi(chainId: ChainId): ApiPromise {
  // `chainId` is what the mocked services key their callbacks by; the rpc stub
  // only keeps the unrelated block-height listener from logging.
  return {
    chainId,
    rpc: { chain: { getBlock: () => Promise.resolve({ block: { header: { number: { toNumber: () => 1 } } } }) } },
  } as unknown as ApiPromise;
}

const polkadotApi = createApi(POLKADOT_AH);
const kusamaApi = createApi(KUSAMA_AH);

function createAccount(id: string): AnyAccount {
  return {
    id,
    walletId: 1,
    name: `account ${id}`,
    type: 'universal',
    accountId: createAccountId(id),
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.WALLET_CONNECT,
    createdAt: 0,
  };
}

const accountA = createAccount('account-a');
const accountB = createAccount('account-b');

// Address book entries — an address with no local account behind it.
const contactOne = createAccountId('contact-one');
const contactTwo = createAccountId('contact-two');

const validatorOne = createAccountId('validator-1');
const validatorTwo = createAccountId('validator-2');

const wallet: Wallet = {
  id: 1,
  name: 'Test wallet',
  type: WalletType.WALLET_CONNECT,
  accounts: [],
};

function createStake(accountId: AccountId, chainId: ChainId, total: string, active: string): Stake {
  return {
    accountId,
    chainId,
    controller: accountId,
    stash: accountId,
    active,
    total,
    unlocking: [],
  };
}

function createExposure(nominator: AccountId, value: string) {
  return {
    total: value,
    own: '0',
    nominatorCount: 1,
    pageCount: 1,
    others: [{ who: nominator, value }],
  };
}

// --- Scope helpers ---

type SetupParams = {
  chains?: Chain[];
  apis?: Record<ChainId, ApiPromise>;
  accountList?: AnyAccount[];
  trackedAccountIds?: AccountId[];
  /** Whether a wallet account is allowed on a chain at all. */
  availableOnChain?: boolean;
  /** Keep the apis back so a test can watch the very first start of a key. */
  deferApis?: boolean;
};

async function landApis(scope: Scope, apis: Record<ChainId, ApiPromise>) {
  // Stores seeded through `fork({ values })` never emit, so the apis landing is
  // what kicks the whole lifecycle - which is also how it happens at runtime.
  await allSettled(networkModel.$apis, { scope, params: apis });
}

async function setup({
  chains = [polkadotChain, kusamaChain],
  apis = { [POLKADOT_AH]: polkadotApi, [KUSAMA_AH]: kusamaApi },
  accountList = [accountA, accountB],
  trackedAccountIds,
  availableOnChain = true,
  deferApis = false,
}: SetupParams = {}): Promise<Scope> {
  const scope = fork({
    values: new Map()
      .set(networkModel.$chains, Object.fromEntries(chains.map(chain => [chain.chainId, chain])))
      .set(walletModel.__test.$rawWallets, [wallet])
      .set(accounts.__test.$list, accountList)
      .set(walletSelect.__test.$selectedWalletId, wallet.id),
  });

  // anyOf registries resolve through the scoped store - an unscoped
  // registerHandler would leave every availability check false.
  await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
    scope,
    params: { body: () => availableOnChain, available: () => true },
  });

  // Tracked before the apis land: the account list is part of every ledger and
  // nominations key, so seeding it first keeps the first start the only start.
  if (trackedAccountIds) {
    await allSettled(stakingPositions.trackAccountIds, { scope, params: trackedAccountIds });
  }

  if (!deferApis) {
    await landApis(scope, apis);
  }

  return scope;
}

async function emitEra(scope: Scope, chainId: ChainId, value: number) {
  chainMock.eras.get(chainId)?.(value);
  await allSettled(scope);
}

async function emitLedger(scope: Scope, chainId: ChainId, ledger: Record<string, Stake | undefined>) {
  chainMock.ledgers.get(chainId)?.(ledger);
  await allSettled(scope);
}

async function emitNominations(scope: Scope, chainId: ChainId, value: Record<string, unknown>) {
  chainMock.nominations.get(chainId)?.(value);
  await allSettled(scope);
}

describe('aggregates/staking-positions', () => {
  let activeScope: Scope | null = null;

  beforeEach(() => {
    chainMock.reset();
  });

  // The resource pools are module-level and ref-counted: leaving a key started
  // would make the next test reuse a subscription bound to a dead scope.
  afterEach(async () => {
    if (activeScope) {
      await allSettled(stakingPositions.reset, { scope: activeScope });
      activeScope = null;
    }
  });

  async function makeScope(params?: SetupParams) {
    const scope = await setup(params);
    activeScope = scope;

    return scope;
  }

  it('derives positions across two chains for two accounts', async () => {
    const scope = await makeScope();

    chainMock.exposurePages[POLKADOT_AH] = { [validatorOne]: createExposure(accountA.accountId, '1000') };
    chainMock.exposurePages[KUSAMA_AH] = { [validatorTwo]: createExposure(accountA.accountId, '500') };

    await emitEra(scope, POLKADOT_AH, 100);
    await emitEra(scope, KUSAMA_AH, 100);

    await emitLedger(scope, POLKADOT_AH, {
      [accountA.accountId]: createStake(accountA.accountId, POLKADOT_AH, '1000', '1000'),
      [accountB.accountId]: createStake(accountB.accountId, POLKADOT_AH, '2000', '2000'),
    });
    await emitLedger(scope, KUSAMA_AH, {
      [accountA.accountId]: createStake(accountA.accountId, KUSAMA_AH, '500', '500'),
      [accountB.accountId]: undefined,
    });

    await emitNominations(scope, POLKADOT_AH, {
      [accountA.accountId]: { targets: [validatorOne], submittedIn: 90 },
      [accountB.accountId]: null,
    });
    await emitNominations(scope, KUSAMA_AH, {
      [accountA.accountId]: { targets: [validatorTwo], submittedIn: 90 },
      [accountB.accountId]: null,
    });

    const positions = scope.getState(stakingPositions.$positions);

    expect(positions).toHaveLength(3);

    const polkadotA = positions.find(p => p.chainId === POLKADOT_AH && p.accountId === accountA.accountId);
    const polkadotB = positions.find(p => p.chainId === POLKADOT_AH && p.accountId === accountB.accountId);
    const kusamaA = positions.find(p => p.chainId === KUSAMA_AH && p.accountId === accountA.accountId);

    expect(polkadotA?.status).toBe('active');
    expect(polkadotA?.activeValidators).toEqual([validatorOne]);
    expect(polkadotB?.status).toBe('bonded');
    expect(kusamaA?.status).toBe('active');
    expect(kusamaA?.activeValidators).toEqual([validatorTwo]);
  });

  it('skips a staking chain absent from the network config and picks it up once present', async () => {
    const scope = await makeScope({ chains: [polkadotChain] });

    expect(scope.getState(stakingPositions.$stakingChains).map(chain => chain.chainId)).toEqual([POLKADOT_AH]);
    expect(chainMock.eras.has(KUSAMA_AH)).toBe(false);

    // Westend Asset Hub only exists in dev configs - it must not be hardcoded
    // away, it must simply follow the config.
    await allSettled(networkModel.$chains, {
      scope,
      params: {
        [POLKADOT_AH]: polkadotChain,
        [WESTEND_AH]: westendChain,
      },
    });

    expect(scope.getState(stakingPositions.$stakingChains).map(chain => chain.chainId)).toEqual([
      POLKADOT_AH,
      WESTEND_AH,
    ]);
  });

  it('starts the new exposure key and stops the old one when the era changes', async () => {
    const scope = await makeScope({ chains: [polkadotChain], apis: { [POLKADOT_AH]: polkadotApi } });

    const started: string[] = [];
    const stopped: string[] = [];

    createWatch({
      unit: exposures.exposuresResource.start,
      scope,
      fn: params => started.push(exposures.exposuresResource.createKey(params)),
    });
    createWatch({ unit: exposures.exposuresResource.stop, scope, fn: key => stopped.push(key) });

    await emitEra(scope, POLKADOT_AH, 200);

    const firstKey = exposures.exposuresResource.createKey({ chainId: POLKADOT_AH, api: polkadotApi, era: 200 });
    const secondKey = exposures.exposuresResource.createKey({ chainId: POLKADOT_AH, api: polkadotApi, era: 201 });

    expect(started).toEqual([firstKey]);
    expect(stopped).toEqual([]);

    await emitEra(scope, POLKADOT_AH, 201);

    expect(started).toEqual([firstKey, secondKey]);
    expect(stopped).toEqual([firstKey]);
  });

  it('summarises totals per chain and counts active validators distinctly', async () => {
    const scope = await makeScope();

    // The same validator key backs a position on both chains - it must count
    // once per chain, not once overall.
    chainMock.exposurePages[POLKADOT_AH] = { [validatorOne]: createExposure(accountA.accountId, '1000') };
    chainMock.exposurePages[KUSAMA_AH] = { [validatorOne]: createExposure(accountA.accountId, '500') };

    await emitEra(scope, POLKADOT_AH, 300);
    await emitEra(scope, KUSAMA_AH, 300);

    const polkadotStakeA = createStake(accountA.accountId, POLKADOT_AH, '1300', '1000');
    polkadotStakeA.unlocking = [
      { value: '100', era: '290' },
      { value: '200', era: '310' },
    ];

    await emitLedger(scope, POLKADOT_AH, {
      [accountA.accountId]: polkadotStakeA,
      [accountB.accountId]: createStake(accountB.accountId, POLKADOT_AH, '2000', '2000'),
    });
    await emitLedger(scope, KUSAMA_AH, {
      [accountA.accountId]: createStake(accountA.accountId, KUSAMA_AH, '500', '500'),
      [accountB.accountId]: undefined,
    });

    await emitNominations(scope, POLKADOT_AH, {
      [accountA.accountId]: { targets: [validatorOne, validatorTwo], submittedIn: 290 },
      [accountB.accountId]: null,
    });
    await emitNominations(scope, KUSAMA_AH, {
      [accountA.accountId]: { targets: [validatorOne], submittedIn: 290 },
      [accountB.accountId]: null,
    });

    const summary = scope.getState(stakingPositions.$summary);

    expect(summary.positionCount).toBe(3);
    expect(summary.earningPositionCount).toBe(2);
    expect(summary.activeValidatorCount).toBe(2);

    expect(summary.byChain[POLKADOT_AH]).toMatchObject({
      totalStaked: '3300',
      redeemable: '100',
      totalUnbonding: '200',
      activeValidatorCount: 1,
      positionCount: 2,
      earningPositionCount: 1,
    });

    expect(summary.byChain[KUSAMA_AH]).toMatchObject({
      totalStaked: '500',
      redeemable: '0',
      totalUnbonding: '0',
      activeValidatorCount: 1,
      positionCount: 1,
      earningPositionCount: 1,
    });
  });

  it('resolves pending for an account with no staking at all', async () => {
    const scope = await makeScope({ chains: [polkadotChain], apis: { [POLKADOT_AH]: polkadotApi } });

    expect(scope.getState(stakingPositions.$pending)).toBe(true);

    await emitEra(scope, POLKADOT_AH, 400);
    expect(scope.getState(stakingPositions.$pending)).toBe(true);

    // The ledger subscription writes an entry per requested account, so an
    // empty ledger is an answer rather than an unfinished load.
    await emitLedger(scope, POLKADOT_AH, {
      [accountA.accountId]: undefined,
      [accountB.accountId]: undefined,
    });

    expect(scope.getState(stakingPositions.$pending)).toBe(false);
    expect(scope.getState(stakingPositions.$positions)).toEqual([]);
  });

  it('stops every started resource key on reset', async () => {
    const scope = await makeScope({ chains: [polkadotChain], apis: { [POLKADOT_AH]: polkadotApi } });

    await emitEra(scope, POLKADOT_AH, 500);

    expect(chainMock.eras.has(POLKADOT_AH)).toBe(true);
    expect(chainMock.ledgers.has(POLKADOT_AH)).toBe(true);
    expect(chainMock.nominations.has(POLKADOT_AH)).toBe(true);
    expect(chainMock.minBonds.has(POLKADOT_AH)).toBe(true);

    const stopped: string[] = [];
    createWatch({ unit: exposures.exposuresResource.stop, scope, fn: key => stopped.push(key) });

    await allSettled(stakingPositions.reset, { scope });
    activeScope = null;

    expect(chainMock.eras.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.ledgers.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.nominations.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.minBonds.has(POLKADOT_AH)).toBe(false);
    expect(stopped).toEqual([
      exposures.exposuresResource.createKey({ chainId: POLKADOT_AH, api: polkadotApi, era: 500 }),
    ]);
  });

  it('does not restart exposure pages when an unrelated store updates', async () => {
    const scope = await makeScope({ chains: [polkadotChain], apis: { [POLKADOT_AH]: polkadotApi } });

    const started: string[] = [];
    createWatch({
      unit: exposures.exposurePagesResource.start,
      scope,
      fn: params => started.push(exposures.exposurePagesResource.createKey(params)),
    });

    await emitEra(scope, POLKADOT_AH, 600);
    await emitLedger(scope, POLKADOT_AH, {
      [accountA.accountId]: createStake(accountA.accountId, POLKADOT_AH, '1000', '1000'),
      [accountB.accountId]: undefined,
    });
    await emitNominations(scope, POLKADOT_AH, {
      [accountA.accountId]: { targets: [validatorOne], submittedIn: 590 },
      [accountB.accountId]: null,
    });

    expect(started).toHaveLength(1);

    const union = scope.getState(stakingPositions.$nominatedValidators);

    // A live subscription re-emits on every block with an identical payload,
    // and the minimum bond has nothing to do with the nominated set.
    chainMock.minBonds.get(POLKADOT_AH)?.('42');
    await allSettled(scope);

    await emitNominations(scope, POLKADOT_AH, {
      [accountA.accountId]: { targets: [validatorOne], submittedIn: 590 },
      [accountB.accountId]: null,
    });

    expect(started).toHaveLength(1);
    expect(scope.getState(stakingPositions.$nominatedValidators)).toBe(union);
    expect(scope.getState(stakingPositions.$minNominatorBond)).toEqual({ [POLKADOT_AH]: '42' });

    // A genuinely different nomination set does restart the pooled request.
    await emitNominations(scope, POLKADOT_AH, {
      [accountA.accountId]: { targets: [validatorOne, validatorTwo], submittedIn: 590 },
      [accountB.accountId]: null,
    });

    expect(started).toHaveLength(2);
  });

  it('derives a position for a tracked address-book id on every staking chain', async () => {
    const scope = await makeScope({ trackedAccountIds: [contactOne] });

    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      { chain: polkadotChain, chainId: POLKADOT_AH, accountIds: [accountA.accountId, accountB.accountId, contactOne] },
      { chain: kusamaChain, chainId: KUSAMA_AH, accountIds: [accountA.accountId, accountB.accountId, contactOne] },
    ]);

    chainMock.exposurePages[POLKADOT_AH] = { [validatorOne]: createExposure(contactOne, '700') };

    await emitEra(scope, POLKADOT_AH, 700);
    await emitEra(scope, KUSAMA_AH, 700);

    await emitLedger(scope, POLKADOT_AH, {
      [accountA.accountId]: undefined,
      [accountB.accountId]: undefined,
      [contactOne]: createStake(contactOne, POLKADOT_AH, '700', '700'),
    });
    await emitLedger(scope, KUSAMA_AH, {
      [accountA.accountId]: undefined,
      [accountB.accountId]: undefined,
      [contactOne]: createStake(contactOne, KUSAMA_AH, '300', '300'),
    });

    await emitNominations(scope, POLKADOT_AH, { [contactOne]: { targets: [validatorOne], submittedIn: 690 } });
    await emitNominations(scope, KUSAMA_AH, { [contactOne]: null });

    const positions = scope.getState(stakingPositions.$positions);

    expect(positions.map(position => position.chainId).sort()).toEqual([POLKADOT_AH, KUSAMA_AH].sort());
    expect(positions.every(position => position.accountId === contactOne)).toBe(true);
    expect(positions.find(position => position.chainId === POLKADOT_AH)?.status).toBe('active');
    expect(scope.getState(stakingPositions.$summary).positionCount).toBe(2);
  });

  it('does not run the wallet chain-availability filter over tracked ids', async () => {
    // Every wallet account is rejected by the availability check; a tracked id
    // is a bare address, so there is nothing to reject and it stays.
    const scope = await makeScope({ availableOnChain: false, trackedAccountIds: [contactOne] });

    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      { chain: polkadotChain, chainId: POLKADOT_AH, accountIds: [contactOne] },
      { chain: kusamaChain, chainId: KUSAMA_AH, accountIds: [contactOne] },
    ]);
  });

  it('subscribes once for an address that is both a wallet account and tracked', async () => {
    const scope = await makeScope({
      chains: [polkadotChain],
      apis: { [POLKADOT_AH]: polkadotApi },
      trackedAccountIds: [accountA.accountId],
      deferApis: true,
    });

    const started: string[] = [];
    const stopped: string[] = [];

    createWatch({
      unit: staking.stakingResource.start,
      scope,
      fn: params => started.push(staking.stakingResource.createKey(params)),
    });
    createWatch({ unit: staking.stakingResource.stop, scope, fn: key => stopped.push(key) });

    await landApis(scope, { [POLKADOT_AH]: polkadotApi });

    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      { chain: polkadotChain, chainId: POLKADOT_AH, accountIds: [accountA.accountId, accountB.accountId] },
    ]);

    expect(started).toEqual([
      staking.stakingResource.createKey({
        chainId: POLKADOT_AH,
        api: polkadotApi,
        accounts: [accountA.accountId, accountB.accountId],
      }),
    ]);
    expect(stopped).toEqual([]);
  });

  it('stops the old keys and starts the new ones when the tracked set changes', async () => {
    const scope = await makeScope({
      chains: [polkadotChain],
      apis: { [POLKADOT_AH]: polkadotApi },
      trackedAccountIds: [contactOne],
    });

    const started: string[] = [];
    const stopped: string[] = [];

    createWatch({
      unit: nominations.nominationsResource.start,
      scope,
      fn: params => started.push(nominations.nominationsResource.createKey(params)),
    });
    createWatch({ unit: nominations.nominationsResource.stop, scope, fn: key => stopped.push(key) });

    await allSettled(stakingPositions.trackAccountIds, { scope, params: [contactTwo] });

    const stashesWith = (tracked: AccountId) => ({
      chainId: POLKADOT_AH,
      api: polkadotApi,
      stashes: [accountA.accountId, accountB.accountId, tracked],
    });

    expect(started).toEqual([nominations.nominationsResource.createKey(stashesWith(contactTwo))]);
    expect(stopped).toEqual([nominations.nominationsResource.createKey(stashesWith(contactOne))]);
  });

  it('clears the tracked ids on reset and releases their subscriptions', async () => {
    const scope = await makeScope({
      chains: [polkadotChain],
      apis: { [POLKADOT_AH]: polkadotApi },
      trackedAccountIds: [contactOne],
    });

    await emitEra(scope, POLKADOT_AH, 800);

    expect(scope.getState(stakingPositions.$trackedAccountIds)).toEqual([contactOne]);
    expect(chainMock.ledgers.has(POLKADOT_AH)).toBe(true);
    expect(chainMock.nominations.has(POLKADOT_AH)).toBe(true);

    const stopped: string[] = [];
    createWatch({ unit: staking.stakingResource.stop, scope, fn: key => stopped.push(key) });

    await allSettled(stakingPositions.reset, { scope });
    activeScope = null;

    expect(scope.getState(stakingPositions.$trackedAccountIds)).toEqual([]);
    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([]);
    expect(chainMock.ledgers.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.nominations.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.eras.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.minBonds.has(POLKADOT_AH)).toBe(false);

    // The tracked id was part of the ledger key, so exactly the key that was
    // started is the key that gets released - no second, stale stop.
    expect(stopped).toEqual([
      staking.stakingResource.createKey({
        chainId: POLKADOT_AH,
        api: polkadotApi,
        accounts: [accountA.accountId, accountB.accountId, contactOne],
      }),
    ]);
  });

  it('keeps the staking domain resources bound to the account list', async () => {
    const scope = await makeScope({ chains: [polkadotChain], apis: { [POLKADOT_AH]: polkadotApi } });

    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      {
        chain: polkadotChain,
        chainId: POLKADOT_AH,
        accountIds: [accountA.accountId, accountB.accountId],
      },
    ]);

    expect(scope.getState(staking.stakingResource.$cache)).toBeDefined();
    expect(scope.getState(nominations.nominationsResource.$cache)).toBeDefined();
    expect(scope.getState(era.eraResource.$cache)).toBeDefined();
  });
});
