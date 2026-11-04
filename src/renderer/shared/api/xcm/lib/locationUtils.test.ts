import { describe, expect, it } from 'vitest';

import { extractAccountIdFromLocation, extractBeneficiariesFromXcmInstructions } from './locationUtils';

const ALICE = `0x${'11'.repeat(32)}`;
const BOB = `0x${'22'.repeat(32)}`;
const EVM = `0x${'33'.repeat(20)}`;

const accountId32 = (id: string, network: unknown = null) => ({ accountId32: { network, id } });
const v3Location = (id: string) => ({ parents: 0, interior: { x1: accountId32(id) } });
const v4Location = (id: string) => ({ parents: 0, interior: { x1: [accountId32(id)] } });
const depositAsset = (beneficiary: unknown) => ({ depositAsset: { assets: { wild: { all: null } }, beneficiary } });

describe('extractAccountIdFromLocation', () => {
  it('reads the account of a versioned location in the decoder string form', () => {
    expect(extractAccountIdFromLocation(JSON.stringify({ v3: v3Location(ALICE) }))).toBe(ALICE);
    expect(extractAccountIdFromLocation(JSON.stringify({ v4: v4Location(ALICE) }))).toBe(ALICE);
  });

  it('accepts a plain or versioned location object, any junction casing', () => {
    expect(extractAccountIdFromLocation(v4Location(ALICE))).toBe(ALICE);
    expect(extractAccountIdFromLocation({ V5: v4Location(ALICE) })).toBe(ALICE);
    expect(
      extractAccountIdFromLocation({ parents: 0, interior: { X1: [{ AccountId32: { network: null, id: ALICE } }] } }),
    ).toBe(ALICE);
  });

  it('finds the account among several junctions, whatever the network', () => {
    const location = {
      v3: { parents: 1, interior: { x2: [{ parachain: 1000 }, accountId32(ALICE, { polkadot: null })] } },
    };

    expect(extractAccountIdFromLocation(JSON.stringify(location))).toBe(ALICE);
    expect(
      extractAccountIdFromLocation({ v2: { parents: 1, interior: { x1: accountId32(ALICE, { any: null }) } } }),
    ).toBe(ALICE);
  });

  it('reads an AccountKey20 junction', () => {
    expect(
      extractAccountIdFromLocation({ parents: 0, interior: { x1: [{ accountKey20: { network: null, key: EVM } }] } }),
    ).toBe(EVM);
  });

  it('is undefined when there is no readable account', () => {
    expect(
      extractAccountIdFromLocation({ v4: { parents: 1, interior: { x1: [{ parachain: 1000 }] } } }),
    ).toBeUndefined();
    expect(extractAccountIdFromLocation({ v4: { parents: 0, interior: { here: null } } })).toBeUndefined();
    expect(extractAccountIdFromLocation(v4Location('0x1234'))).toBeUndefined();
    expect(extractAccountIdFromLocation('not json')).toBeUndefined();
    expect(extractAccountIdFromLocation(ALICE)).toBeUndefined();
    expect(extractAccountIdFromLocation(undefined)).toBeUndefined();
  });
});

describe('extractBeneficiariesFromXcmInstructions', () => {
  it('collects every deposit of a program, direct ones first', () => {
    const program = {
      v4: [
        { setAppendix: [depositAsset(v4Location(BOB))] },
        { buyExecution: { fees: {}, weightLimit: { unlimited: null } } },
        depositAsset(v4Location(ALICE)),
      ],
    };

    expect(extractBeneficiariesFromXcmInstructions(JSON.stringify(program))).toEqual([ALICE, BOB]);
  });

  it('collects deposits of every program version and of programs forwarded to another chain', () => {
    expect(extractBeneficiariesFromXcmInstructions({ v3: [depositAsset(v3Location(ALICE))] })).toEqual([ALICE]);
    expect(
      extractBeneficiariesFromXcmInstructions({
        v5: [{ transferAsset: { assets: [], beneficiary: v4Location(ALICE) } }],
      }),
    ).toEqual([ALICE]);

    const forwarded = {
      v4: [
        {
          depositReserveAsset: {
            assets: {},
            dest: { parents: 1, interior: { x1: [{ parachain: 2000 }] } },
            xcm: [depositAsset(v4Location(ALICE))],
          },
        },
        { initiateTeleport: { assets: {}, dest: {}, xcm: [depositAsset(v4Location(BOB))] } },
        { setErrorHandler: [depositAsset(v4Location(ALICE))] },
      ],
    };

    expect(extractBeneficiariesFromXcmInstructions(forwarded)).toEqual([ALICE, BOB, ALICE]);
  });

  it('is unreadable when any deposit has no readable beneficiary', () => {
    const program = { v4: [depositAsset(v4Location(ALICE)), depositAsset({ parents: 0, interior: { here: null } })] };

    expect(extractBeneficiariesFromXcmInstructions(program)).toBeNull();
    expect(extractBeneficiariesFromXcmInstructions({ v4: [{ setAppendix: [depositAsset('garbage')] }] })).toBeNull();
  });

  it('is unreadable for an opaque Transact or a malformed program', () => {
    expect(
      extractBeneficiariesFromXcmInstructions({
        v4: [depositAsset(v4Location(ALICE)), { transact: { call: '0x00' } }],
      }),
    ).toBeNull();
    expect(extractBeneficiariesFromXcmInstructions('not json')).toBeNull();
    expect(extractBeneficiariesFromXcmInstructions({ v4: { depositAsset: {} } })).toBeNull();
    expect(extractBeneficiariesFromXcmInstructions(undefined)).toBeNull();
  });

  it('is empty for a program that deposits nowhere', () => {
    expect(extractBeneficiariesFromXcmInstructions({ v4: [{ clearOrigin: null }] })).toEqual([]);
  });
});
