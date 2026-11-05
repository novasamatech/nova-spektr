import { describe, expect, it } from 'vitest';

import { extractAccountIdFromLocation, extractBeneficiariesFromXcmInstructions } from './locationUtils';

const ALICE = `0x${'11'.repeat(32)}`;
const BOB = `0x${'22'.repeat(32)}`;
const EVM = `0x${'33'.repeat(20)}`;
const EVM_OWNER = `0x${'44'.repeat(32)}`;

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

  it('descends into a forwarded program whatever the casing of its field', () => {
    const forwarded = {
      V5: [
        { InitiateTransfer: { destination: {}, assets: [], RemoteXcm: [depositAsset(v4Location(ALICE))] } },
        { DepositReserveAsset: { assets: {}, dest: {}, Xcm: [depositAsset(v4Location(BOB))] } },
      ],
    };

    expect(extractBeneficiariesFromXcmInstructions(forwarded)).toEqual([ALICE, BOB]);
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

  it('reads the account named by the location an instruction forwards assets to', () => {
    const chainLocation = { parents: 1, interior: { x1: [{ parachain: 2000 }] } };

    expect(
      extractBeneficiariesFromXcmInstructions({
        v4: [{ depositReserveAsset: { assets: { wild: { all: null } }, dest: v4Location(ALICE), xcm: [] } }],
      }),
    ).toEqual([ALICE]);
    expect(
      extractBeneficiariesFromXcmInstructions({
        V5: [
          { TransferReserveAsset: { assets: [], dest: v4Location(ALICE), xcm: [] } },
          { InitiateTeleport: { assets: {}, dest: v4Location(BOB), xcm: [] } },
          { InitiateReserveWithdraw: { assets: {}, reserve: v4Location(ALICE), xcm: [] } },
          { InitiateTransfer: { destination: v4Location(BOB), assets: [], remoteXcm: [] } },
        ],
      }),
    ).toEqual([ALICE, BOB, ALICE, BOB]);
    // A forward to a chain pays whoever the forwarded program names.
    expect(
      extractBeneficiariesFromXcmInstructions({
        v4: [
          depositAsset(v4Location(ALICE)),
          { depositReserveAsset: { assets: {}, dest: chainLocation, xcm: [] } },
          { depositReserveAsset: { assets: {}, dest: v4Location(BOB), xcm: [] } },
        ],
      }),
    ).toEqual([ALICE, BOB]);
  });

  it('lists accounts of forwarding locations after direct and nested deposits', () => {
    const dest = { parents: 1, interior: { x2: [{ parachain: 2000 }, accountId32(ALICE)] } };

    expect(
      extractBeneficiariesFromXcmInstructions({
        v4: [{ depositReserveAsset: { assets: {}, dest, xcm: [depositAsset(v4Location(BOB))] } }],
      }),
    ).toEqual([BOB, ALICE]);
    expect(
      extractBeneficiariesFromXcmInstructions({
        v4: [
          { depositReserveAsset: { assets: {}, dest, xcm: [] } },
          { setAppendix: [depositAsset(v4Location(EVM_OWNER))] },
          depositAsset(v4Location(BOB)),
        ],
      }),
    ).toEqual([BOB, EVM_OWNER, ALICE]);
  });

  it('is unreadable when a forwarding location names an account that can not be read', () => {
    const forwardTo = (junction: unknown) => ({
      depositReserveAsset: {
        assets: {},
        dest: { parents: 1, interior: { x2: [{ parachain: 2000 }, junction] } },
        xcm: [],
      },
    });

    expect(
      extractBeneficiariesFromXcmInstructions({
        v4: [depositAsset(v4Location(ALICE)), forwardTo(accountId32('0x1234'))],
      }),
    ).toBeNull();
    expect(
      extractBeneficiariesFromXcmInstructions({
        v4: [depositAsset(v4Location(ALICE)), forwardTo({ accountIndex64: { network: null, index: 7 } })],
      }),
    ).toBeNull();
    expect(
      extractBeneficiariesFromXcmInstructions({
        V4: [depositAsset(v4Location(ALICE)), forwardTo({ AccountKey20: { network: null, key: '0x12' } })],
      }),
    ).toBeNull();
  });

  it('is unreadable for a program that names no recipient', () => {
    expect(extractBeneficiariesFromXcmInstructions({ v4: [] })).toBeNull();
    expect(extractBeneficiariesFromXcmInstructions({ v4: [{ clearOrigin: null }] })).toBeNull();
    expect(
      extractBeneficiariesFromXcmInstructions({
        v4: [
          {
            depositReserveAsset: {
              assets: { wild: { all: null } },
              dest: { parents: 1, interior: { x1: [{ parachain: 2000 }] } },
              xcm: [],
            },
          },
        ],
      }),
    ).toBeNull();
  });
});
