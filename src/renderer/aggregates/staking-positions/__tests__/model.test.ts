import { type ApiPromise } from '@polkadot/api';
import { type Scope, allSettled, createWatch, fork } from 'effector';

import { type Chain, type ChainId, type Stake, type Wallet, CryptoType, SigningType, WalletType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { AssetHubChains, era, exposures, nominations, staking } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { stakingPositions } from '../model';

// The staking domain talks to the chain through six service modules. Mocking
// exactly those keeps the pooled resources, their caches and the refcounting
// real - only the api reads are replaced.
const chainMock = vi.hoisted(() => {
  type Callback<T> = (value: T) => void;

  const ledgers = new Map<string, Callback<Record<string, unknown>>>();
  const nominations = new Map<string, Callback<Record<string, unknown>>>();
  const validatorPrefs = new Map<string, Callback<Record<string, unknown>>>();
  const minBonds = new Map<string, Callback<string>>();
  const eras = new Map<string, Callback<number | undefined>>();

  const exposurePages: Record<string, Record<string, unknown>> = {};
  const validators: Record<string, Record<string, unknown>> = {};

  const reset = () => {
    ledgers.clear();
    nominations.clear();
    validatorPrefs.clear();
    minBonds.clear();
    eras.clear();

    for (const key of Object.keys(exposurePages)) delete exposurePages[key];
    for (const key of Object.keys(validators)) delete validators[key];
  };

  return { ledgers, nominations, validatorPrefs, minBonds, eras, exposurePages, validators, reset };
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

vi.mock('@/domains/staking/validator-prefs/service', () => ({
  validatorPrefsService: {
    subscribeValidatorPrefs: (api: { chainId: string }, _stashes: unknown, callback: never) => {
      chainMock.validatorPrefs.set(api.chainId, callback);

      return Promise.resolve(() => chainMock.validatorPrefs.delete(api.chainId));
    },
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
// An account of a different wallet: the selection spans every wallet.
const accountC: AnyAccount = { ...createAccount('account-c'), walletId: 2 };

// Address book entries — an address with no local account behind it.
const contactOne = createAccountId('contact-one');
const contactTwo = createAccountId('contact-two');

// An address book row of an EVM chain: 20 bytes instead of 32.
const ethereumContact = pjsSchema.helpers.toAccountId('0x9f56c5a609ebb39982064da081d78aa429928b64');

const validatorOne = createAccountId('validator-1');
const validatorTwo = createAccountId('validator-2');

const wallet: Wallet = {
  id: 1,
  name: 'Test wallet',
  type: WalletType.WALLET_CONNECT,
  accounts: [],
};

/** The aggregate keeps the selection sorted, whatever order it was given in. */
function sorted(accountIds: AccountId[]): AccountId[] {
  return [...accountIds].sort();
}

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
  /** The dashboard selection; defaults to both wallet accounts. */
  selectedAccountIds?: AccountId[];
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
  selectedAccountIds = [accountA.accountId, accountB.accountId],
  availableOnChain = true,
  deferApis = false,
}: SetupParams = {}): Promise<Scope> {
  const scope = fork({
    values: new Map()
      .set(networkModel.$chains, Object.fromEntries(chains.map(chain => [chain.chainId, chain])))
      .set(walletModel.__test.$rawWallets, [wallet])
      .set(accounts.__test.$list, accountList),
  });

  // anyOf registries resolve through the scoped store - an unscoped
  // registerHandler would leave every availability check false.
  await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
    scope,
    params: { body: () => availableOnChain, available: () => true },
  });

  // Selected before the apis land: the account list is part of every ledger
  // and nominations key, so seeding it first keeps the first start the only
  // start.
  await allSettled(stakingPositions.selectAccountIds, { scope, params: selectedAccountIds });

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

async function emitPrefs(scope: Scope, chainId: ChainId, value: Record<string, unknown>) {
  chainMock.validatorPrefs.get(chainId)?.(value);
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

  /**
   * The regression this guards: the aggregate used to hand `derivePosition` an
   * empty exposure map while the pages were still in flight, which is the same
   * shape as "no validator backs this stash". Every nominating position wore a
   * red `inactive` pill for the seconds in between and then flipped to active.
   */
  it('reports unknown while the exposure pages are in flight, not inactive', async () => {
    const scope = await makeScope({
      chains: [polkadotChain],
      apis: { [POLKADOT_AH]: polkadotApi },
      accountList: [accountA],
    });

    chainMock.exposurePages[POLKADOT_AH] = { [validatorTwo]: createExposure(accountA.accountId, '1000') };

    // An era and a validator no other test uses. The exposure request cache is
    // module-level and never goes stale, so a key another test already fetched
    // is answered without ever pushing a value into this scope's store.
    await emitEra(scope, POLKADOT_AH, 500);
    await emitLedger(scope, POLKADOT_AH, {
      [accountA.accountId]: createStake(accountA.accountId, POLKADOT_AH, '1000', '1000'),
    });

    // The window is a few ticks wide and closes on its own, so the assertion is
    // over everything the store passed through rather than over one snapshot.
    const seen: string[] = [];
    createWatch({
      unit: stakingPositions.$positions,
      scope,
      fn: positions => {
        const status = positions.find(position => position.accountId === accountA.accountId)?.status;
        if (status && seen.at(-1) !== status) seen.push(status);
      },
    });

    // The nominations are what the exposure request is keyed by: the moment
    // they land, nothing has been read about the exposures yet.
    await emitNominations(scope, POLKADOT_AH, {
      [accountA.accountId]: { targets: [validatorTwo], submittedIn: 490 },
    });

    // The pool starts its keys through a `scopeBind`, which `allSettled` cannot
    // see into: draining once leaves the exposure read itself untouched.
    await allSettled(scope);

    expect(seen).toEqual(['unknown', 'active']);

    const landed = scope.getState(stakingPositions.$positions);
    expect(landed[0]?.statusReason).toBeNull();
    expect(landed[0]?.activeValidators).toEqual([validatorTwo]);
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

  it('stays pending until validator prefs cover the bonded accounts', async () => {
    const scope = await makeScope({ chains: [polkadotChain], apis: { [POLKADOT_AH]: polkadotApi } });

    await emitEra(scope, POLKADOT_AH, 410);
    await emitLedger(scope, POLKADOT_AH, {
      [accountA.accountId]: createStake(accountA.accountId, POLKADOT_AH, '1000', '1000'),
      [accountB.accountId]: undefined,
    });
    await emitNominations(scope, POLKADOT_AH, {
      [accountA.accountId]: { targets: [validatorOne], submittedIn: 400 },
      [accountB.accountId]: null,
    });

    // Nominations answered but the prefs did not — without them a validator
    // position would first render as a bonded nominator and then flip.
    expect(scope.getState(stakingPositions.$pending)).toBe(true);

    // `null` is a real answer ("not a validator"): coverage is about the key
    // existing in the map, not about the account being a validator.
    await emitPrefs(scope, POLKADOT_AH, { [accountA.accountId]: null });

    expect(scope.getState(stakingPositions.$pending)).toBe(false);
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

  it('derives a position for a selected address-book id on every staking chain', async () => {
    const scope = await makeScope({ selectedAccountIds: [accountA.accountId, accountB.accountId, contactOne] });

    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      {
        chain: polkadotChain,
        chainId: POLKADOT_AH,
        accountIds: sorted([accountA.accountId, accountB.accountId, contactOne]),
      },
      {
        chain: kusamaChain,
        chainId: KUSAMA_AH,
        accountIds: sorted([accountA.accountId, accountB.accountId, contactOne]),
      },
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

  it('answers for the selection alone - accounts of several wallets, unselected ones left out', async () => {
    const scope = await makeScope({
      chains: [polkadotChain],
      apis: { [POLKADOT_AH]: polkadotApi },
      accountList: [accountA, accountB, accountC],
      selectedAccountIds: [accountC.accountId, accountA.accountId],
    });

    // `accountB` belongs to the same wallet as `accountA` and is still not
    // asked about: the wallet is not the unit of selection, the account is.
    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      { chain: polkadotChain, chainId: POLKADOT_AH, accountIds: sorted([accountA.accountId, accountC.accountId]) },
    ]);
  });

  it('does not run the wallet chain-availability filter over address-book ids', async () => {
    // Every wallet account is rejected by the availability check; an
    // address-book id is a bare address, so there is nothing to reject and it
    // stays.
    const scope = await makeScope({
      availableOnChain: false,
      selectedAccountIds: [accountA.accountId, accountB.accountId, contactOne],
    });

    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      { chain: polkadotChain, chainId: POLKADOT_AH, accountIds: [contactOne] },
      { chain: kusamaChain, chainId: KUSAMA_AH, accountIds: [contactOne] },
    ]);
  });

  it('drops a selected id whose key scheme the chain cannot hold', async () => {
    // `staking.bonded.multi` rejects the whole batch when one key is
    // unencodable, and the failure lands as an empty ledger map for the chain -
    // so a single EVM address book row used to keep every account of every
    // staking chain in a permanent skeleton.
    const scope = await makeScope({
      selectedAccountIds: [accountA.accountId, accountB.accountId, contactOne, ethereumContact],
    });

    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      {
        chain: polkadotChain,
        chainId: POLKADOT_AH,
        accountIds: sorted([accountA.accountId, accountB.accountId, contactOne]),
      },
      {
        chain: kusamaChain,
        chainId: KUSAMA_AH,
        accountIds: sorted([accountA.accountId, accountB.accountId, contactOne]),
      },
    ]);
  });

  it('subscribes once for an address selected twice', async () => {
    const scope = await makeScope({
      chains: [polkadotChain],
      apis: { [POLKADOT_AH]: polkadotApi },
      selectedAccountIds: [accountA.accountId, accountB.accountId, accountA.accountId],
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
      { chain: polkadotChain, chainId: POLKADOT_AH, accountIds: sorted([accountA.accountId, accountB.accountId]) },
    ]);

    expect(started).toEqual([
      staking.stakingResource.createKey({
        chainId: POLKADOT_AH,
        api: polkadotApi,
        accounts: sorted([accountA.accountId, accountB.accountId]),
      }),
    ]);
    expect(stopped).toEqual([]);
  });

  it('stops the old keys and starts the new ones when the selection changes', async () => {
    const scope = await makeScope({
      chains: [polkadotChain],
      apis: { [POLKADOT_AH]: polkadotApi },
      selectedAccountIds: [accountA.accountId, accountB.accountId, contactOne],
    });

    const started: string[] = [];
    const stopped: string[] = [];

    createWatch({
      unit: nominations.nominationsResource.start,
      scope,
      fn: params => started.push(nominations.nominationsResource.createKey(params)),
    });
    createWatch({ unit: nominations.nominationsResource.stop, scope, fn: key => stopped.push(key) });

    await allSettled(stakingPositions.selectAccountIds, {
      scope,
      params: [accountA.accountId, accountB.accountId, contactTwo],
    });

    const stashesWith = (contact: AccountId) => ({
      chainId: POLKADOT_AH,
      api: polkadotApi,
      stashes: sorted([accountA.accountId, accountB.accountId, contact]),
    });

    expect(started).toEqual([nominations.nominationsResource.createKey(stashesWith(contactTwo))]);
    expect(stopped).toEqual([nominations.nominationsResource.createKey(stashesWith(contactOne))]);
  });

  it('keeps the selection until the last consumer releases it', async () => {
    const scope = await makeScope({ chains: [polkadotChain], apis: { [POLKADOT_AH]: polkadotApi } });

    await allSettled(stakingPositions.retainSelection, { scope });
    await allSettled(stakingPositions.retainSelection, { scope });

    // The Overview accounts table and the Staking tab hold the selection at the
    // same time - hiding one of them must not blank the other.
    await allSettled(stakingPositions.releaseSelection, { scope });
    expect(scope.getState(stakingPositions.$selectedAccountIds)).toEqual(
      sorted([accountA.accountId, accountB.accountId]),
    );
    expect(chainMock.ledgers.has(POLKADOT_AH)).toBe(true);

    await allSettled(stakingPositions.releaseSelection, { scope });
    expect(scope.getState(stakingPositions.$selectedAccountIds)).toEqual([]);
    expect(chainMock.ledgers.has(POLKADOT_AH)).toBe(false);
  });

  it('clears the selection on reset and releases its subscriptions', async () => {
    const scope = await makeScope({
      chains: [polkadotChain],
      apis: { [POLKADOT_AH]: polkadotApi },
      selectedAccountIds: [accountA.accountId, accountB.accountId, contactOne],
    });

    await emitEra(scope, POLKADOT_AH, 800);

    expect(scope.getState(stakingPositions.$selectedAccountIds)).toEqual(
      sorted([accountA.accountId, accountB.accountId, contactOne]),
    );
    expect(chainMock.ledgers.has(POLKADOT_AH)).toBe(true);
    expect(chainMock.nominations.has(POLKADOT_AH)).toBe(true);

    const stopped: string[] = [];
    createWatch({ unit: staking.stakingResource.stop, scope, fn: key => stopped.push(key) });

    await allSettled(stakingPositions.reset, { scope });
    activeScope = null;

    expect(scope.getState(stakingPositions.$selectedAccountIds)).toEqual([]);
    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      { chain: polkadotChain, chainId: POLKADOT_AH, accountIds: [] },
    ]);
    expect(chainMock.ledgers.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.nominations.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.eras.has(POLKADOT_AH)).toBe(false);
    expect(chainMock.minBonds.has(POLKADOT_AH)).toBe(false);

    // The selection was part of the ledger key, so exactly the key that was
    // started is the key that gets released - no second, stale stop.
    expect(stopped).toEqual([
      staking.stakingResource.createKey({
        chainId: POLKADOT_AH,
        api: polkadotApi,
        accounts: sorted([accountA.accountId, accountB.accountId, contactOne]),
      }),
    ]);
  });

  it('keeps the staking domain resources bound to the account list', async () => {
    const scope = await makeScope({ chains: [polkadotChain], apis: { [POLKADOT_AH]: polkadotApi } });

    expect(scope.getState(stakingPositions.$chainAccounts)).toEqual([
      {
        chain: polkadotChain,
        chainId: POLKADOT_AH,
        accountIds: sorted([accountA.accountId, accountB.accountId]),
      },
    ]);

    expect(scope.getState(staking.stakingResource.$cache)).toBeDefined();
    expect(scope.getState(nominations.nominationsResource.$cache)).toBeDefined();
    expect(scope.getState(era.eraResource.$cache)).toBeDefined();
  });
});
