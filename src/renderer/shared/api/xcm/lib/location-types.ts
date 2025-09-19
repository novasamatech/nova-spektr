import { type HexString } from '@/shared/core';

export type Junction =
  | { Parachain: number }
  | { AccountId32: { network?: string; id: HexString } }
  | { AccountKey20: { network?: string; key: HexString } }
  | { PalletInstance: number }
  | { GeneralIndex: string }
  | { GeneralKey: { length: number; data: HexString } };

export type RelativeMultiLocation = {
  parents: number;
  interior: Junction[];
};

export type AbsoluteMultiLocation = {
  interior: Junction[];
};

export type XcmVersion = 2 | 3 | 4 | 5;

export type VersionedXcm<T> = {
  xcm: T;
  version: XcmVersion;
};

// Helper functions for creating multi-locations
export function createParachainJunction(id: number): Junction {
  return { Parachain: id };
}

export function createAbsoluteMultiLocation(...junctions: Junction[]): AbsoluteMultiLocation {
  return { interior: junctions };
}

export function createRelativeMultiLocation(parents: number, ...junctions: Junction[]): RelativeMultiLocation {
  return { parents, interior: junctions };
}

export function createHere(): Junction[] {
  return [];
}

export function createVersionedXcm<T>(xcm: T, version: XcmVersion): VersionedXcm<T> {
  return { xcm, version };
}
