import { BN, BN_TEN, BN_ZERO } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';

import { XCM_URL, XCM_KEY } from './common/constants';
import {
  XcmConfig,
  AssetLocation,
  AssetName,
  AssetXCM,
  MultiLocation as LocalMultiLocation,
  ChainXCM,
  InstructionType,
  Instructions,
  XcmTransfer,
} from './common/types';
import { AccountId, ChainId } from '@renderer/domain/shared-kernel';
// TODO: Move chain to shared
import { Chain } from '@renderer/entities/chain';
import { getTypeVersion, toLocalChainId } from '@renderer/shared/lib/utils';

export const fetchXcmConfig = async (): Promise<XcmConfig> => {
  const response = await fetch(XCM_URL, { cache: 'default' });

  return response.json();
};

export const getXcmConfig = (): XcmConfig | null => {
  const storageConfig = localStorage.getItem(XCM_KEY);

  try {
    return storageConfig ? JSON.parse(storageConfig) : null;
  } catch (error) {
    console.error('Could not parse XCM config - ', error);

    return null;
  }
};

export const saveXcmConfig = (config: XcmConfig) => {
  localStorage.setItem(XCM_KEY, JSON.stringify(config));
};

export const getAvailableDirections = (chains: ChainXCM[], assetId: number, chainId: ChainId): XcmTransfer[] => {
  const chain = chains.find((c) => c.chainId === toLocalChainId(chainId));
  const asset = chain?.assets.find((a) => a.assetId === assetId);

  return asset?.xcmTransfers || [];
};

export const weightToFee = (weight: BN, unitsPerSecond: BN): BN => {
  const pico = BN_TEN.pow(new BN(12));

  return weight.mul(unitsPerSecond).div(pico);
};

export const getEstimatedWeight = (
  instructions: Instructions,
  instructionName: InstructionType,
  instructionWeight: BN,
): BN => {
  if (!instructionName || !instructionWeight) return BN_ZERO;

  const instruction = instructions[instructionName];

  return instructionWeight.mul(new BN(instruction.length));
};

export const estimateFee = (
  config: XcmConfig,
  assetLocation: AssetLocation,
  originChain: string,
  xcmTransfer: XcmTransfer,
): BN => {
  const weight = getEstimatedWeight(
    config.instructions,
    xcmTransfer.destination.fee.instructions,
    new BN(config.networkBaseWeight[xcmTransfer.destination.chainId]),
  );

  const fee = weightToFee(weight, new BN(xcmTransfer.destination.fee.mode.value));

  const isReserveChain = [originChain, xcmTransfer.destination.chainId].includes(assetLocation.chainId);

  if (isReserveChain) return fee;

  const reserveWeight = getEstimatedWeight(
    config.instructions,
    assetLocation.reserveFee.instructions,
    new BN(config.networkBaseWeight[assetLocation.chainId]),
  );

  const reserveFee = weightToFee(reserveWeight, new BN(assetLocation.reserveFee.mode.value));

  return fee.add(reserveFee);
};

export const estimateRequiredDestWeight = (
  config: XcmConfig,
  assetLocation: AssetLocation,
  originChain: string,
  xcmTransfer: XcmTransfer,
): BN => {
  const weight = getEstimatedWeight(
    config.instructions,
    xcmTransfer.destination.fee.instructions,
    new BN(config.networkBaseWeight[xcmTransfer.destination.chainId]),
  );

  const isReserveChain = [originChain, xcmTransfer.destination.chainId].includes(assetLocation.chainId);

  if (isReserveChain) return weight;

  const reserveWeight = getEstimatedWeight(
    config.instructions,
    assetLocation.reserveFee.instructions,
    new BN(config.networkBaseWeight[assetLocation.chainId]),
  );

  return weight.gte(reserveWeight) ? weight : reserveWeight;
};

const JunctionType: Record<string, string> = {
  parachainId: 'Parachain',
  generalKey: 'GeneralKey',
  palletInstance: 'PalletInstance',
  accountKey: 'AccountKey20',
  accountId: 'AccountId32',
  generalIndex: 'GeneralIndex',
};

type JunctionTypeKey = keyof typeof JunctionType;

const JunctionHierarchyLevel: Record<JunctionTypeKey, number> = {
  parachainId: 0,
  palletInstance: 1,
  accountKey: 1,
  accountId: 1,
  generalKey: 2,
  generalIndex: 2,
};

export const sortJunctions = (a: JunctionTypeKey, b: JunctionTypeKey): number => {
  return JunctionHierarchyLevel[a] - JunctionHierarchyLevel[b];
};

export const createJunctionFromObject = (data: {}) => {
  const entries = Object.entries(data);

  if (entries.length === 0) return 'Here';

  if (entries.length === 1) {
    return {
      X1: {
        [JunctionType[entries[0][0] as JunctionTypeKey]]: entries[0][1],
      },
    };
  }

  return {
    [`X${entries.length}`]: entries
      .sort((a, b) => sortJunctions(a[0], b[0]))
      .map((e) => ({
        [JunctionType[e[0] as JunctionTypeKey]]: e[1],
      })),
  };
};

export const getAssetLocation = (
  api: ApiPromise,
  asset: AssetXCM,
  assets: Record<AssetName, AssetLocation>,
  amount: BN,
): Object | undefined => {
  const location = {
    relative: () => getRelativeAssetLocation(assets[asset.assetLocation].multiLocation),
    absolute: () => getAbsoluteAssetLocation(assets[asset.assetLocation].multiLocation),
    concrete: () => getConcreteAssetLocation(asset.assetLocationPath.path),
  }[asset.assetLocationPath.type]();

  const assetVersionType = getTypeVersion(api, 'VersionedMultiAssets');

  const assetLocation = {
    [assetVersionType]: [
      {
        id: {
          Concrete: location,
        },
        fun: {
          Fungible: amount,
        },
      },
    ],
  };

  return assetLocation;
};

const getRelativeAssetLocation = (assetLocation?: LocalMultiLocation): Object | undefined => {
  if (!assetLocation) return;

  const { parachainId: _, ...location } = assetLocation;

  return {
    parents: 0,
    interior: createJunctionFromObject(location),
  };
};

const getAbsoluteAssetLocation = (assetLocation?: LocalMultiLocation): Object | undefined => {
  if (!assetLocation) return;

  return {
    parents: 1,
    interior: createJunctionFromObject(assetLocation),
  };
};

const getConcreteAssetLocation = (assetLocation?: LocalMultiLocation): Object | undefined => {
  if (!assetLocation) return;

  const { parents, ...location } = assetLocation;

  return {
    parents,
    interior: createJunctionFromObject(location),
  };
};

export const getVersionedDestinationLocation = (
  api: ApiPromise,
  originChain: Pick<Chain, 'parentId'>,
  destinationParaId?: number,
  accountId?: AccountId,
): Object | undefined => {
  const location = getDestinationLocation(originChain, destinationParaId, accountId);
  const version = getTypeVersion(api, 'VersionedMultiLocation');

  return {
    [version]: location,
  };
};

export const getDestinationLocation = (
  originChain: Pick<Chain, 'parentId'>,
  destinationParaId?: number,
  accountId?: AccountId,
): Object | undefined => {
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
};

export const getAccountLocation = (accountId?: AccountId): Object | undefined => {
  return {
    parents: 0,
    interior: {
      X1: {
        accountId32: {
          network: 'Any',
          id: accountId,
        },
      },
    },
  };
};

const getChildLocation = (parachainId: number, accountId?: AccountId): Object => {
  const location: Record<string, any> = { parachainId };

  if (accountId) {
    location.accountId = {
      network: 'Any',
      id: accountId,
    };
  }

  return {
    parents: 0,
    interior: createJunctionFromObject(location),
  };
};

const getParentLocation = (accountId?: AccountId): Object => {
  const location: Record<string, any> = {};

  if (accountId) {
    location.accountId = {
      network: 'Any',
      id: accountId,
    };
  }

  return {
    parents: 1,
    interior: createJunctionFromObject(location),
  };
};

const getSiblingLocation = (parachainId: number, accountId?: AccountId): Object => {
  const location: Record<string, any> = { parachainId };

  if (accountId) {
    location.accountId = {
      network: 'Any',
      id: accountId,
    };
  }

  return {
    parents: 1,
    interior: createJunctionFromObject(location),
  };
};
