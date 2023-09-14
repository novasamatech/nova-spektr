import { BN, BN_TEN, BN_ZERO } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { VersionedMultiAsset, VersionedMultiLocation } from '@polkadot/types/interfaces';
import get from 'lodash/get';

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
  NetworkBaseWeight,
  XcmTransfer,
  PathType,
} from './common/types';
import { AccountId, ChainId, HexString } from '@renderer/domain/shared-kernel';
// TODO: Move chain to shared
import { Chain } from '@renderer/entities/chain';
import { XcmPalletTransferArgs, XTokenPalletTransferArgs } from '@renderer/entities/transaction';
import { useChains } from '@renderer/entities/network';
import { getAssetId } from '@renderer/shared/lib/utils';
import { toRawString } from './common/utils';

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
  const chain = chains.find((c) => c.chainId === chainId);
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
  instructions: Instructions,
  baseWeights: NetworkBaseWeight,
  assetLocation: AssetLocation,
  originChain: string,
  xcmTransfer: XcmTransfer,
): BN => {
  const weight = getEstimatedWeight(
    instructions,
    xcmTransfer.destination.fee.instructions,
    new BN(xcmTransfer.destination.fee.mode.value),
  );

  const fee = weightToFee(weight, new BN(baseWeights[xcmTransfer.destination.chainId]));

  const isReserveChain = [originChain, xcmTransfer.destination.chainId].includes(assetLocation.chainId);

  if (isReserveChain) return fee;

  const reserveWeight = getEstimatedWeight(
    instructions,
    assetLocation.reserveFee.instructions,
    new BN(assetLocation.reserveFee.mode.value),
  );

  const reserveFee = weightToFee(reserveWeight, new BN(baseWeights[assetLocation.chainId]));

  return fee.add(reserveFee);
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
    [`X${entries.length}`]: entries.map((e) => ({
      [JunctionType[e[0] as JunctionTypeKey]]: e[1],
    })),
  };
};

export const getAssetLocation = (
  api: ApiPromise,
  asset: AssetXCM,
  assets: Record<AssetName, AssetLocation>,
  amount: BN,
): VersionedMultiAsset | undefined => {
  const PathMap: Record<PathType, () => VersionedMultiAsset | undefined> = {
    relative: () => getRelativeAssetLocation(api, amount, assets[asset.assetLocation].multiLocation),
    absolute: () => getAbsoluteAssetLocation(api, amount, assets[asset.assetLocation].multiLocation),
    concrete: () => getConcreteAssetLocation(api, amount, asset.assetLocationPath.path),
  };

  return PathMap[asset.assetLocationPath.type]();
};

const getRelativeAssetLocation = (
  api: ApiPromise,
  amount: BN,
  assetLocation?: LocalMultiLocation,
): VersionedMultiAsset | undefined => {
  if (!assetLocation) return;

  const { parachainId: _, ...location } = assetLocation;

  return api.createType('VersionedMultiAsset', {
    V2: {
      id: {
        Concrete: {
          parents: 0,
          interior: Object.values(location).length ? createJunctionFromObject(location) : 'Here',
        },
      },
      fun: {
        Fungible: amount.toNumber(),
      },
    },
  });
};

const getAbsoluteAssetLocation = (
  api: ApiPromise,
  amount: BN,
  assetLocation?: LocalMultiLocation,
): VersionedMultiAsset | undefined => {
  if (!assetLocation) return;

  return api.createType('VersionedMultiAsset', {
    V2: {
      id: {
        Concrete: {
          parents: 1,
          interior: Object.values(assetLocation).length ? createJunctionFromObject(assetLocation) : 'Here',
        },
      },
      fungibility: {
        Fungible: amount.toNumber(),
      },
    },
  });
};

const getConcreteAssetLocation = (
  api: ApiPromise,
  amount: BN,
  assetLocation?: LocalMultiLocation,
): VersionedMultiAsset | undefined => {
  if (!assetLocation) return;

  const { parents, ...location } = assetLocation;

  return api.createType('VersionedMultiAsset', {
    V2: {
      id: {
        Concrete: {
          parents,
          interior: Object.values(location).length ? createJunctionFromObject(location) : 'Here',
        },
      },
      fun: {
        Fungible: amount.toNumber(),
      },
    },
  });
};

export const getDestinationLocation = (
  api: ApiPromise,
  originChain: Pick<Chain, 'parentId'>,
  destinationParaId?: number,
  accountId?: AccountId,
): VersionedMultiLocation | undefined => {
  if (originChain.parentId && destinationParaId) {
    return getSiblingLocation(api, destinationParaId, accountId);
  }

  if (originChain.parentId) {
    return getParentLocation(api, accountId);
  }

  if (destinationParaId) {
    return getChildLocation(api, destinationParaId, accountId);
  }

  return undefined;
};

const getChildLocation = (api: ApiPromise, parachainId: number, accountId?: AccountId): VersionedMultiLocation => {
  const location: Record<string, any> = { parachainId };

  if (accountId) {
    location.accountId = {
      network: 'Any',
      id: accountId,
    };
  }

  return api.createType('VersionedMultiLocation', {
    V2: {
      parents: 0,
      interior: createJunctionFromObject(location),
    },
  });
};

const getParentLocation = (api: ApiPromise, accountId?: AccountId): VersionedMultiLocation => {
  const location: Record<string, any> = {};

  if (accountId) {
    location.accountId = {
      network: 'Any',
      id: accountId,
    };
  }

  return api.createType('VersionedMultiLocation', {
    V2: {
      parents: 1,
      interior: createJunctionFromObject(location),
    },
  });
};

const getSiblingLocation = (api: ApiPromise, parachainId: number, accountId?: AccountId): VersionedMultiLocation => {
  const location: Record<string, any> = { parachainId };

  if (accountId) {
    location.accountId = {
      network: 'Any',
      id: accountId,
    };
  }

  return api.createType('VersionedMultiLocation', {
    V2: {
      parents: 1,
      interior: createJunctionFromObject(location),
    },
  });
};

type ParsedPayload = {
  isRelayToken: boolean;
  amount: string;
  destParachain: number;
  destAccountId: string;
  toRelayChain: boolean;
};

type XcmPalletPayload = ParsedPayload & {
  assetGeneralIndex: string;
  type: 'xcmPallet';
};

type XTokensPayload = ParsedPayload & {
  assetGeneralKey: string;
  assetParachain: number;
  type: 'xTokens';
};

export const parseXcmPalletExtrinsic = (
  args: Omit<XcmPalletTransferArgs, 'feeAssetItem' | 'weightLimit'>,
): XcmPalletPayload => {
  const xcmVersion = Object.keys(args.dest as Object)[0];

  const assetInterior = get(args.assets, `${xcmVersion}[0].id.Concrete.interior`) as Object;
  const destInterior = get(args.dest, `${xcmVersion}.interior`) as Object;
  const beneficiaryInterior = get(args.beneficiary, `${xcmVersion}.interior`) as Object;

  const parsedPayload = {
    isRelayToken: assetInterior === 'Here',
    amount: toRawString(get(args.assets, `${xcmVersion}[0].fun.Fungible`)),
    destParachain: 0,
    destAccountId: '',
    assetGeneralIndex: '',
    toRelayChain: destInterior === 'Here',
    type: 'xcmPallet' as const,
  };

  const beneficiaryJunction = Object.keys(beneficiaryInterior)[0];
  parsedPayload.destAccountId = get(beneficiaryInterior, `${beneficiaryJunction}.AccountId32.id`);

  const destJunction = Object.keys(destInterior)[0];
  parsedPayload.destParachain = Number(toRawString(get(destInterior, `${destJunction}.Parachain`)));

  if (!parsedPayload.isRelayToken) {
    const assetJunction = Object.keys(assetInterior)[0];
    const cols = getJunctionCols<{ GeneralIndex: string }>(assetInterior, assetJunction);
    parsedPayload.assetGeneralIndex = toRawString(cols.GeneralIndex);
  }

  return parsedPayload;
};

export const parseXTokensExtrinsic = (
  args: Omit<XTokenPalletTransferArgs, 'destWeight' | 'destWeightLimit'>,
): XTokensPayload => {
  const xcmVersion = Object.keys(args.dest as Object)[0];

  const assetInterior = get(args.asset, `${xcmVersion}.id.Concrete.interior`) as Object;
  const destInterior = get(args.dest, `${xcmVersion}.interior`) as Object;

  const parsedPayload = {
    isRelayToken: assetInterior === 'Here',
    amount: toRawString(get(args.asset, `${xcmVersion}.fun.Fungible`)),
    destParachain: 0,
    destAccountId: '',
    assetParachain: 0,
    assetGeneralKey: '',
    toRelayChain: false,
    type: 'xTokens' as const,
  };

  if (!parsedPayload.isRelayToken) {
    const assetJunction = Object.keys(assetInterior)[0];
    const cols = getJunctionCols<{ Parachain: number; GeneralKey: string }>(assetInterior, assetJunction);
    parsedPayload.assetParachain = cols.Parachain;
    parsedPayload.assetGeneralKey = cols.GeneralKey;
  }

  const destJunction = Object.keys(destInterior)[0];
  parsedPayload.toRelayChain = destJunction === 'X1';

  if (parsedPayload.toRelayChain) {
    parsedPayload.destAccountId = get(destInterior, 'X1.AccountId32.id');
  } else {
    const cols = getJunctionCols<{ Parachain?: number }>(destInterior, destJunction);
    if (cols.Parachain) {
      parsedPayload.destParachain = cols.Parachain;
      parsedPayload.toRelayChain = false;
    }
    parsedPayload.destAccountId = get(cols, 'AccountId32.id');
  }

  return parsedPayload;
};

type DecodedPayload = {
  assetId?: number | string;
  destinationChain?: HexString;
  value: string;
  dest: string;
};

const getJunctionCols = <T extends Object>(interior: Object, path: string): T => {
  return Object.values(get(interior, path) as Object).reduce((acc, item) => {
    return { ...acc, ...item };
  }, {});
};

export const decodeXcm = (chainId: ChainId, data: XcmPalletPayload | XTokensPayload): DecodedPayload => {
  const { getChainById } = useChains();

  const config = getXcmConfig();
  if (!config) return {} as DecodedPayload;

  let destinationChain: HexString | undefined;
  if (data.toRelayChain) {
    destinationChain = getChainById(chainId)?.parentId;
  } else {
    const destination = Object.values(config.assetsLocation).find(({ multiLocation }) => {
      return multiLocation.parachainId === data.destParachain;
    });

    destinationChain = destination ? `0x${destination.chainId}` : undefined;
  }

  const configOriginChain = config.chains.find((c) => `0x${c.chainId}` === chainId);

  let assetId: number | string | undefined;
  if (!data.isRelayToken && configOriginChain) {
    const filteredAssetLocations = configOriginChain.assets.reduce<[number, AssetLocation][]>((acc, asset) => {
      acc.push([asset.assetId, config.assetsLocation[asset.assetLocation]]);

      return acc;
    }, []);

    const assetKeyVal = filteredAssetLocations.find(([_, { multiLocation }]) => {
      const xcmPalletMatch = data.type === 'xcmPallet' && multiLocation.generalIndex === data.assetGeneralIndex;

      const xTokensMatch =
        data.type === 'xTokens' &&
        multiLocation.parachainId === data.assetParachain &&
        multiLocation.generalKey === data.assetGeneralKey;

      return xcmPalletMatch || xTokensMatch;
    });

    if (assetKeyVal) {
      const assetFromChain = getChainById(chainId)?.assets.find((asset) => asset.assetId === assetKeyVal[0]);
      if (assetFromChain) {
        assetId = getAssetId(assetFromChain);
      }
    } else {
      console.log(`XCM config cannot handle - ${data}`);
    }
  }

  return {
    assetId,
    destinationChain,
    value: data.amount,
    dest: data.destAccountId,
  };
};
