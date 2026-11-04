import { type ApiPromise } from '@polkadot/api';

import { type Asset, type Chain } from '@/shared/core';
import { polkadotAssetHubChain } from '@/shared/mocks';
import { encodeCallData, getCallMeta, parseCallData, resolveAmountUnit } from '../extrinsicBuilder';

function makeSiType(def: Record<string, unknown>) {
  return {
    path: [],
    def: {
      isPrimitive: false,
      isComposite: false,
      isVariant: false,
      isSequence: false,
      isArray: false,
      isCompact: false,
      isTuple: false,
      ...def,
    },
  };
}

const primitive = (name: string) => makeSiType({ isPrimitive: true, asPrimitive: { toString: () => name } });
const compact = (inner: string) => makeSiType({ isCompact: true, asCompact: { type: { toString: () => inner } } });
const named = (name: string, type: string, typeName: string) => ({
  name: { isSome: true, unwrap: () => ({ toString: () => name }) },
  type: { toString: () => type },
  typeName: { isSome: true, unwrap: () => ({ toString: () => typeName }) },
});
const unnamed = (type: string, typeName: string) => ({ ...named('0', type, typeName), name: { isSome: false } });

const SI_TYPES: Record<number, unknown> = {
  1: primitive('U64'),
  2: compact('1'),
  3: primitive('U128'),
  4: compact('3'),
  5: primitive('U32'),
  6: compact('5'),
  // sp_weights::Weight { #[compact] ref_time: u64, #[compact] proof_size: u64 }
  10: makeSiType({
    isComposite: true,
    asComposite: { fields: [named('ref_time', '2', 'u64'), named('proof_size', '2', 'u64')] },
  }),
  // VestingInfo { locked: Balance, start: BlockNumber }
  11: makeSiType({
    isComposite: true,
    asComposite: { fields: [named('locked', '4', 'Balance'), named('start', '5', 'BlockNumber')] },
  }),
  // enum { Here, Fungible(#[compact] u128) } — XCM-like amount without a balance name
  12: makeSiType({
    isVariant: true,
    asVariant: {
      variants: [
        { name: { toString: () => 'Here' }, index: { toNumber: () => 0 }, fields: [] },
        { name: { toString: () => 'Fungible' }, index: { toNumber: () => 1 }, fields: [unnamed('4', 'u128')] },
      ],
    },
  }),
  // enum { FreeBalance(BalanceOf<T>) }
  13: makeSiType({
    isVariant: true,
    asVariant: {
      variants: [
        { name: { toString: () => 'FreeBalance' }, index: { toNumber: () => 0 }, fields: [unnamed('3', 'Balance')] },
      ],
    },
  }),
  // AccountVote { Standard { vote: Vote, balance: Balance }, Split { aye: Balance, nay: Balance } }
  14: makeSiType({
    isVariant: true,
    asVariant: {
      variants: [
        {
          name: { toString: () => 'Standard' },
          index: { toNumber: () => 0 },
          fields: [named('vote', '5', 'Vote'), named('balance', '3', 'Balance')],
        },
        {
          name: { toString: () => 'Split' },
          index: { toNumber: () => 1 },
          fields: [named('aye', '3', 'Balance'), named('nay', '3', 'Balance')],
        },
      ],
    },
  }),
};

const arg = (name: string, type: string, typeName: string | null) => ({
  name: { toString: () => name },
  type: { toString: () => type },
  typeName: typeName ? { isSome: true, unwrap: () => ({ toString: () => typeName }) } : { isSome: false },
});

const CALLS: Record<string, Record<string, ReturnType<typeof arg>[]>> = {
  multisig: { asMulti: [arg('threshold', '5', 'u16'), arg('max_weight', '10', 'Weight')] },
  balances: { transferKeepAlive: [arg('dest', 'MultiAddress', null), arg('value', '4', 'T::Balance')] },
  assets: {
    transfer: [
      arg('id', '6', 'T::AssetIdParameter'),
      arg('target', 'MultiAddress', null),
      arg('amount', '4', 'T::Balance'),
    ],
  },
  convictionVoting: {
    vote: [arg('poll_index', '5', 'PollIndexOf<T, I>'), arg('vote', '14', 'AccountVote<BalanceOf<T, I>>')],
  },
  vesting: { vestedTransfer: [arg('schedule', '11', 'VestingInfo<BalanceOf<T>, BlockNumberFor<T>>')] },
  nominationPools: { bondExtra: [arg('extra', '13', 'BondExtra<BalanceOf<T>>')] },
  xcmPallet: { send: [arg('asset', '12', 'Fungibility')] },
  timestamp: { set: [arg('now', '2', 'T::Moment')] },
};

const num = (value: bigint) => ({ toBigInt: () => value, toString: () => value.toString() });
const struct = (entries: [string, unknown][]) => ({ defKeys: entries.map(([k]) => k), entries: () => entries });
const variant = (type: string, inner?: unknown) => ({ type, [`is${type}`]: true, [`as${type}`]: inner });
const address = (value: string) => ({ type: 'Id', inner: { toString: () => value } });

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

type Decoded = { call: string; args: [string, unknown][] };

/**
 * Decoded argument codecs per case, as the parser receives them from
 * `api.createType('Call', hex)`.
 */
const DECODED: Record<string, Decoded> = {
  'multisig.asMulti': {
    call: 'multisig.asMulti',
    args: [
      ['threshold', num(2n)],
      [
        'max_weight',
        struct([
          ['ref_time', num(1_000_000_000n)],
          ['proof_size', num(5_000n)],
        ]),
      ],
    ],
  },
  'balances.transferKeepAlive': {
    call: 'balances.transferKeepAlive',
    args: [
      ['dest', address(ALICE)],
      ['value', num(15_000_000_001n)],
    ],
  },
  'assets.transfer USDT': {
    call: 'assets.transfer',
    args: [
      ['id', num(1984n)],
      ['target', address(ALICE)],
      ['amount', num(1_500_001n)],
    ],
  },
  'assets.transfer zero decimals': {
    call: 'assets.transfer',
    args: [
      ['id', num(4242n)],
      ['target', address(ALICE)],
      ['amount', num(7n)],
    ],
  },
  'vesting.vestedTransfer': {
    call: 'vesting.vestedTransfer',
    args: [
      [
        'schedule',
        struct([
          ['locked', num(15_000_000_000n)],
          ['start', num(100n)],
        ]),
      ],
    ],
  },
  'nominationPools.bondExtra': {
    call: 'nominationPools.bondExtra',
    args: [['extra', variant('FreeBalance', num(25_000_000_000n))]],
  },
  'convictionVoting.vote': {
    call: 'convictionVoting.vote',
    args: [
      ['poll_index', num(42n)],
      [
        'vote',
        variant(
          'Split',
          struct([
            ['aye', num(10_000_000_000n)],
            ['nay', num(5_000_000_000n)],
          ]),
        ),
      ],
    ],
  },
  'xcmPallet.send': { call: 'xcmPallet.send', args: [['asset', variant('Fungible', num(1_500_000n))]] },
  'timestamp.set': { call: 'timestamp.set', args: [['now', num(1_700_000_000_000n)]] },
};

function createApi(onCall: (args: unknown[]) => void) {
  let decoded: Decoded = { call: '', args: [] };

  const tx: Record<string, Record<string, unknown>> = {};
  for (const [pallet, calls] of Object.entries(CALLS)) {
    tx[pallet] = {};
    for (const [method, args] of Object.entries(calls)) {
      tx[pallet]![method] = Object.assign(
        (...callArgs: unknown[]) => {
          onCall(callArgs);

          return { method: { toHex: () => '0x00' } };
        },
        { meta: { args, docs: [] } },
      );
    }
  }

  const api = {
    tx,
    registry: {
      lookup: {
        getSiType: (id: number) => {
          const type = SI_TYPES[id];
          if (!type) throw new Error(`Type ${id} not found`);

          return type;
        },
        getName: () => null,
        getTypeDef: () => {
          throw new Error('not implemented');
        },
        types: [],
      },
      findMetaCall: () => {
        const [section, method] = decoded.call.split('.');

        return { section, method };
      },
    },
    createType: () => ({ argsEntries: decoded.args, callIndex: new Uint8Array([0, 0]) }),
  } as unknown as ApiPromise;

  return {
    api,
    decode: (target: string) => {
      decoded = DECODED[target]!;

      return parseCallData(api, '0x00', chain);
    },
  };
}

const [, usdt] = polkadotAssetHubChain.assets;
const zeroDecimalAsset: Asset = { ...usdt!, symbol: 'ZERO', precision: 0, typeExtras: { assetId: '4242' } };

/** DOT (10 decimals), USDT 1984 (6 decimals) and a 0-decimal asset */
const chain: Chain = { ...polkadotAssetHubChain, assets: [...polkadotAssetHubChain.assets, zeroDecimalAsset] };

/**
 * Decode, then re-encode what the form would hold, capturing the args handed to
 * the api.
 */
function roundTrip(target: string) {
  let captured: unknown[] = [];
  const { api, decode } = createApi((args) => {
    captured = args;
  });

  const parsed = decode(target);
  if (!parsed) throw new Error('parse failed');

  const argDefs = getCallMeta(api, parsed.pallet, parsed.call)!.args;
  const unit = resolveAmountUnit({ chain, pallet: parsed.pallet, method: parsed.call, args: parsed.args });
  const encoded = encodeCallData(
    api,
    parsed.pallet,
    parsed.call,
    argDefs.map((def) => parsed.args[def.name]),
    argDefs,
    unit,
  );

  return { parsed, encoded, captured };
}

describe('features/extrinsic-builder amount round-trip', () => {
  it('keeps weights as raw integers in both directions', () => {
    const { parsed, encoded, captured } = roundTrip('multisig.asMulti');

    expect(parsed.args['max_weight']).toEqual({ ref_time: '1000000000', proof_size: '5000' });
    expect(encoded).toBe('0x00');
    expect(captured[1]).toEqual({ ref_time: '1000000000', proof_size: '5000' });
  });

  it('shows a native amount at full precision and encodes it back unchanged', () => {
    const { parsed, captured } = roundTrip('balances.transferKeepAlive');

    expect(parsed.args).toEqual({ dest: ALICE, value: '1.5000000001' });
    expect(captured).toEqual([ALICE, '15000000001']);
  });

  it('shows an assets.transfer amount in the asset precision and encodes it back unchanged', () => {
    const { parsed, captured } = roundTrip('assets.transfer USDT');

    expect(parsed.args).toEqual({ id: '1984', target: ALICE, amount: '1.500001' });
    expect(captured).toEqual(['1984', ALICE, '1500001']);
  });

  it('keeps an amount of a 0-decimal asset whole in both directions', () => {
    const { parsed, captured } = roundTrip('assets.transfer zero decimals');

    expect(parsed.args).toEqual({ id: '4242', target: ALICE, amount: '7' });
    expect(captured).toEqual(['4242', ALICE, '7']);
  });

  it('shows a nested native amount in tokens and encodes it back unchanged', () => {
    const { parsed, captured } = roundTrip('vesting.vestedTransfer');

    expect(parsed.args['schedule']).toEqual({ locked: '1.5', start: '100' });
    expect(captured[0]).toEqual({ locked: '15000000000', start: '100' });
  });

  it('shows an amount inside an enum variant in tokens and encodes it back unchanged', () => {
    const { parsed, captured } = roundTrip('nominationPools.bondExtra');

    expect(parsed.args['extra']).toEqual({ variant: 'FreeBalance', values: { '0': '2.5' } });
    expect(captured[0]).toEqual({ FreeBalance: '25000000000' });
  });

  it('shows amounts of a multi-field enum variant by field name and encodes them back unchanged', () => {
    const { parsed, captured } = roundTrip('convictionVoting.vote');

    expect(parsed.args['vote']).toEqual({ variant: 'Split', values: { aye: '1', nay: '0.5' } });
    expect(captured).toEqual(['42', { Split: { aye: '10000000000', nay: '5000000000' } }]);
  });

  it('keeps an XCM amount in base units instead of scaling it by the native precision', () => {
    const { parsed, captured } = roundTrip('xcmPallet.send');

    expect(parsed.args['asset']).toEqual({ variant: 'Fungible', values: { '0': '1500000' } });
    expect(captured[0]).toEqual({ Fungible: '1500000' });
  });

  it('keeps a Compact<u64> without a balance name as a raw integer', () => {
    const { parsed, captured } = roundTrip('timestamp.set');

    expect(parsed.args['now']).toBe('1700000000000');
    expect(captured[0]).toBe('1700000000000');
  });
});
