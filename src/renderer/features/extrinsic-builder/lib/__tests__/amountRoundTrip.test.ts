import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';
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
};

const arg = (name: string, type: string, typeName: string | null) => ({
  name: { toString: () => name },
  type: { toString: () => type },
  typeName: typeName ? { isSome: true, unwrap: () => ({ toString: () => typeName }) } : { isSome: false },
});

const CALLS: Record<string, Record<string, ReturnType<typeof arg>[]>> = {
  multisig: { asMulti: [arg('threshold', '5', 'u16'), arg('max_weight', '10', 'Weight')] },
  vesting: { vestedTransfer: [arg('schedule', '11', 'VestingInfo<BalanceOf<T>, BlockNumberFor<T>>')] },
  nominationPools: { bondExtra: [arg('extra', '13', 'BondExtra<BalanceOf<T>>')] },
  xcmPallet: { send: [arg('asset', '12', 'Fungibility')] },
  timestamp: { set: [arg('now', '2', 'T::Moment')] },
};

const num = (value: bigint) => ({ toBigInt: () => value, toString: () => value.toString() });
const struct = (entries: [string, unknown][]) => ({ defKeys: entries.map(([k]) => k), entries: () => entries });
const variant = (type: string, inner?: unknown) => ({ type, [`is${type}`]: true, [`as${type}`]: inner });

/**
 * Decoded argument codecs per call, as the parser receives them from
 * `api.createType('Call', hex)`.
 */
const DECODED: Record<string, [string, unknown][]> = {
  'multisig.asMulti': [
    ['threshold', num(2n)],
    [
      'max_weight',
      struct([
        ['ref_time', num(1_000_000_000n)],
        ['proof_size', num(5_000n)],
      ]),
    ],
  ],
  'vesting.vestedTransfer': [
    [
      'schedule',
      struct([
        ['locked', num(15_000_000_000n)],
        ['start', num(100n)],
      ]),
    ],
  ],
  'nominationPools.bondExtra': [['extra', variant('FreeBalance', num(25_000_000_000n))]],
  'xcmPallet.send': [['asset', variant('Fungible', num(1_500_000n))]],
  'timestamp.set': [['now', num(1_700_000_000_000n)]],
};

function createApi(onCall: (args: unknown[]) => void) {
  let decodeTarget = '';

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
        const [section, method] = decodeTarget.split('.');

        return { section, method };
      },
    },
    createType: () => ({ argsEntries: DECODED[decodeTarget], callIndex: new Uint8Array([0, 0]) }),
  } as unknown as ApiPromise;

  return {
    api,
    decode: (target: string) => {
      decodeTarget = target;

      return parseCallData(api, '0x00', chain);
    },
  };
}

const chain = {
  assets: [{ assetId: 0, symbol: 'DOT', precision: 10, type: 'native' }],
} as unknown as Chain;

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
