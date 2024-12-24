import { type ApiPromise } from '@polkadot/api';
import { type Balance } from '@polkadot/types/interfaces';
import { BN, BN_TEN, BN_ZERO } from '@polkadot/util';
import get from 'lodash/get';

import { type AccountId, type Chain } from '@/shared/core';
import { TEST_ACCOUNTS, getTypeVersion, isEthereumAccountId } from '@/shared/lib/utils';

import { INSTRUCTION_OBJECT } from './constants';
import {
  type Action,
  type AssetLocation,
  type InstructionType,
  type Instructions,
  type MultiLocation as LocalMultiLocation,
  type XcmConfig,
  type XcmTransfer,
} from './types';

export const xcmUtils = {
  getEstimatedWeight,
  getEstimatedFeeFromConfig,

  getRelativeAssetLocation,
  getAbsoluteAssetLocation,
  getConcreteAssetLocation,

  getDestinationLocation,
  getAccountLocation,
  getJunctionCols,
  estimateFeeFromApi,

  toRawString,
};

const JunctionType: Record<string, string> = {
  parachainId: 'Parachain',
  generalKey: 'GeneralKey',
  palletInstance: 'PalletInstance',
  accountKey: 'AccountKey20',
  accountId: 'AccountId32',
  generalIndex: 'GeneralIndex',
};

export type JunctionTypeKey = keyof typeof JunctionType;

const JunctionHierarchyLevel: Record<JunctionTypeKey, number> = {
  parachainId: 0,
  palletInstance: 1,
  accountKey: 1,
  accountId: 1,
  generalKey: 2,
  generalIndex: 2,
};

function weightToFee(weight: BN, unitsPerSecond: BN): BN {
  const pico = BN_TEN.pow(new BN(12));

  return weight.mul(unitsPerSecond).div(pico);
}

function getEstimatedWeight(instructions: Instructions, name: InstructionType, weight: BN): BN {
  if (!name || !weight) return BN_ZERO;

  return weight.mul(new BN(instructions[name].length));
}

function getEstimatedFeeFromConfig(
  config: XcmConfig,
  assetLocation: AssetLocation,
  originChain: string,
  xcmTransfer: XcmTransfer,
): BN {
  const weight = getEstimatedWeight(
    config.instructions,
    xcmTransfer.destination.fee.instructions,
    new BN(config.networkBaseWeight[xcmTransfer.destination.chainId]),
  );

  const fee = weightToFee(weight, new BN(xcmTransfer.destination.fee.mode.value));

  if (!assetLocation?.reserveFee) return fee;

  const isReserveChain = [originChain, xcmTransfer.destination.chainId].includes(assetLocation.chainId);

  if (isReserveChain) return fee;

  const reserveWeight = getEstimatedWeight(
    config.instructions,
    assetLocation.reserveFee.instructions,
    new BN(config.networkBaseWeight[assetLocation.chainId]),
  );

  const reserveFee = weightToFee(reserveWeight, new BN(assetLocation.reserveFee.mode.value));

  return fee.add(reserveFee);
}

function sortJunctions(a: JunctionTypeKey, b: JunctionTypeKey): number {
  return JunctionHierarchyLevel[a] - JunctionHierarchyLevel[b];
}

function createJunctionFromObject(data: Record<string, unknown>) {
  const entries = Object.entries(data);

  if (entries.length === 0) return 'Here';

  return {
    [`X${entries.length}`]: entries
      .sort((a, b) => sortJunctions(a[0], b[0]))
      .map((e) => ({
        [JunctionType[e[0] as JunctionTypeKey]]: e[1],
      })),
  };
}

function getRelativeAssetLocation(assetLocation?: LocalMultiLocation) {
  if (!assetLocation) return;

  const { parachainId: _, ...location } = assetLocation;

  return {
    parents: 0,
    interior: createJunctionFromObject(location),
  };
}

function getAbsoluteAssetLocation(assetLocation?: LocalMultiLocation) {
  if (!assetLocation) return;

  return {
    parents: 1,
    interior: createJunctionFromObject(assetLocation),
  };
}

function getConcreteAssetLocation(assetLocation?: LocalMultiLocation) {
  if (!assetLocation) return;

  const { parents, ...location } = assetLocation;

  return {
    parents,
    interior: createJunctionFromObject(location),
  };
}

function getDestinationLocation(
  originChain: Pick<Chain, 'parentId'>,
  destinationParaId?: number,
  accountId?: AccountId,
) {
  if (originChain.parentId && destinationParaId) {
    return getSiblingLocation(destinationParaId, accountId);
  }

  if (originChain.parentId) {
    return getParentLocation(accountId);
  }

  if (destinationParaId) {
    return getChildLocation(destinationParaId, accountId);
  }

  return undefined;
}

function getAccountLocation(accountId?: AccountId) {
  const isEthereum = isEthereumAccountId(accountId);

  return {
    parents: 0,
    interior: {
      X1: [
        {
          [isEthereum ? 'accountKey20' : 'accountId32']: {
            network: null,
            [isEthereum ? 'key' : 'id']: accountId,
          },
        },
      ],
    },
  };
}

function getChildLocation(parachainId: number, accountId?: AccountId) {
  const location: Record<string, any> = { parachainId };
  const isEthereum = isEthereumAccountId(accountId);

  if (accountId) {
    location[isEthereum ? 'accountKey' : 'accountId'] = {
      network: null,
      [isEthereum ? 'key' : 'id']: accountId,
    };
  }

  return {
    parents: 0,
    interior: createJunctionFromObject(location),
  };
}

function getParentLocation(accountId?: AccountId) {
  const location: Record<string, any> = {};
  const isEthereum = isEthereumAccountId(accountId);

  if (accountId) {
    location[isEthereum ? 'accountKey' : 'accountId'] = {
      network: null,
      [isEthereum ? 'key' : 'id']: accountId,
    };
  }

  return {
    parents: 1,
    interior: createJunctionFromObject(location),
  };
}

function getSiblingLocation(parachainId: number, accountId?: AccountId) {
  const location: Record<string, any> = { parachainId };
  const isEthereum = isEthereumAccountId(accountId);

  if (accountId) {
    location[isEthereum ? 'accountKey' : 'accountId'] = {
      network: null,
      [isEthereum ? 'key' : 'id']: accountId,
    };
  }

  return {
    parents: 1,
    interior: createJunctionFromObject(location),
  };
}

function getJunctionCols<T>(interior: Record<string, object>, path: string): T {
  if (path === 'X1') {
    return get(interior, path) as T;
  }

  return Object.values(get(interior, path)).reduce((acc, item) => {
    return { ...acc, ...item };
  }, {});
}

async function estimateFeeFromApi(
  api: ApiPromise,
  instructions: Action[],
  assetLocation: object,
  destLocation: object,
): Promise<Balance> {
  const pallet = api.tx.xcmPallet ? 'xcmPallet' : 'polkadotXcm';
  const xcmVersion = getTypeVersion(api, 'VersionedXcm');
  const message = {
    [xcmVersion]: instructions.map((i) => INSTRUCTION_OBJECT[i](assetLocation, destLocation)),
  };

  let paymentInfo;

  try {
    paymentInfo = await api.tx[pallet].execute(message, 0).paymentInfo(TEST_ACCOUNTS[0]);
  } catch {
    paymentInfo = await api.tx[pallet].execute(message, { refTime: '0', proofSize: '0' }).paymentInfo(TEST_ACCOUNTS[0]);
  }

  return paymentInfo.partialFee;
}

function toRawString(value?: string): string {
  if (!value) return '';

  return value.replaceAll(',', '');
}
