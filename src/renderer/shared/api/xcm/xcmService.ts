import { BN, BN_TEN, BN_ZERO } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import get from 'lodash/get';

import { XCM_URL, XCM_KEY } from './lib/constants';
import {
  getTypeVersion,
  toLocalChainId,
  getTypeName,
  getAssetId,
  TEST_ACCOUNTS,
  isEthereumAccountId,
} from '@shared/lib/utils';
import { XcmPalletTransferArgs, XTokenPalletTransferArgs } from '@entities/transaction';
import { chainsService } from '@shared/api/network';
import { toRawString } from './lib/utils';
import type { AccountId, ChainId, Chain, HexString } from '@shared/core';
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
  PathType,
  Action,
  XcmTransferType,
} from './lib/types';

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

export const estimateFee = async (
  config: XcmConfig,
  assetLocation: AssetLocation,
  originChain: string,
  xcmTransfer: XcmTransfer,
  api?: ApiPromise,
  xcmAsset?: object,
  xcmDest?: object,
): Promise<BN> => {
  if (xcmTransfer.destination.fee.mode.type === 'proportional') {
    return estimateFeeFromConfig(config, assetLocation, originChain, xcmTransfer);
  }

  if (api && xcmAsset && xcmDest) {
    const xcmAssetLocation = Object.values(xcmAsset)[0][0].id.Concrete;
    const xcmDestLocation = Object.values(xcmDest as object)[0];

    return estimateFeeFromApi(
      api,
      config.instructions[xcmTransfer.destination.fee.instructions],
      xcmAssetLocation,
      xcmDestLocation,
    );
  }

  return new BN(0);
};

export const estimateFeeFromConfig = (
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
  transferType: XcmTransferType,
  asset: AssetXCM,
  assets: Record<AssetName, AssetLocation>,
  amount: BN,
  isArray: boolean = true,
): Object | undefined => {
  const PathMap: Record<PathType, () => Object | undefined> = {
    relative: () => getRelativeAssetLocation(assets[asset.assetLocation].multiLocation),
    absolute: () => getAbsoluteAssetLocation(assets[asset.assetLocation].multiLocation),
    concrete: () => getConcreteAssetLocation(asset.assetLocationPath.path),
  };

  const location = PathMap[asset.assetLocationPath.type]();

  const type = getTypeName(api, transferType, isArray ? 'assets' : 'asset');
  const assetVersionType = getTypeVersion(api, type || '');
  const assetObject = {
    id: {
      Concrete: location,
    },
    fun: {
      Fungible: amount,
    },
  };

  return {
    [assetVersionType]: isArray ? [assetObject] : assetObject,
  };
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
  transferType: XcmTransferType,
  originChain: Pick<Chain, 'parentId'>,
  destinationParaId?: number,
  accountId?: AccountId,
): Object | undefined => {
  const location = getDestinationLocation(originChain, destinationParaId, accountId);
  const type = getTypeName(api, transferType, 'dest');
  const version = getTypeVersion(api, type || '');

  if (!version) return location;

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

export const getVersionedAccountLocation = (
  api: ApiPromise,
  transferType: XcmTransferType,
  accountId?: AccountId,
): Object | undefined => {
  const location = getAccountLocation(accountId);
  const type = getTypeName(api, transferType, 'dest');
  const version = getTypeVersion(api, type || '');

  if (!version) return location;

  return {
    [version]: location,
  };
};

export const getAccountLocation = (accountId?: AccountId): Object | undefined => {
  const account = isEthereumAccountId(accountId)
    ? {
        accountKey20: {
          network: 'Any',
          key: accountId,
        },
      }
    : {
        accountId32: {
          network: 'Any',
          id: accountId,
        },
      };

  return {
    parents: 0,
    interior: {
      X1: account,
    },
  };
};

const getChildLocation = (parachainId: number, accountId?: AccountId): Object => {
  const location: Record<string, any> = { parachainId };
  const isEthereum = isEthereumAccountId(accountId);

  if (accountId) {
    if (isEthereum) {
      location.accountKey = {
        network: 'Any',
        key: accountId,
      };
    } else {
      location.accountId = {
        network: 'Any',
        id: accountId,
      };
    }
  }

  return {
    parents: 0,
    interior: createJunctionFromObject(location),
  };
};

const getParentLocation = (accountId?: AccountId): Object => {
  const location: Record<string, any> = {};
  const isEthereum = isEthereumAccountId(accountId);

  if (accountId) {
    if (isEthereum) {
      location.accountKey = {
        network: 'Any',
        key: accountId,
      };
    } else {
      location.accountId = {
        network: 'Any',
        id: accountId,
      };
    }
  }

  return {
    parents: 1,
    interior: createJunctionFromObject(location),
  };
};

const getSiblingLocation = (parachainId: number, accountId?: AccountId): Object => {
  const location: Record<string, any> = { parachainId };
  const isEthereum = isEthereumAccountId(accountId);

  if (accountId) {
    if (isEthereum) {
      location.accountKey = {
        network: 'Any',
        key: accountId,
      };
    } else {
      location.accountId = {
        network: 'Any',
        id: accountId,
      };
    }
  }

  return {
    parents: 1,
    interior: createJunctionFromObject(location),
  };
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
  const config = getXcmConfig();
  if (!config) return {} as DecodedPayload;

  let destinationChain: HexString | undefined;
  if (data.toRelayChain) {
    destinationChain = chainsService.getChainById(chainId)?.parentId;
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
      const assetFromChain = chainsService
        .getChainById(chainId)
        ?.assets.find((asset) => asset.assetId === assetKeyVal[0]);
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

const InstructionObjects: Record<Action, (assetLocation: object, destLocation: object) => object> = {
  [Action.WITHDRAW_ASSET]: (assetLocation: object) => {
    return {
      WithdrawAsset: [
        {
          fun: {
            Fungible: '0',
          },
          id: assetLocation,
        },
      ],
    };
  },

  [Action.CLEAR_ORIGIN]: () => {
    return {
      ClearOrigin: null,
    };
  },

  [Action.DEPOSIT_ASSET]: () => {
    return {
      DepositAsset: {
        assets: {
          Wild: 'All',
        },
        maxAssets: 1,
        beneficiary: {
          interior: {
            X1: {
              AccountId32: {
                network: 'Any',
                id: TEST_ACCOUNTS[0],
              },
            },
          },
          parents: 0,
        },
      },
    };
  },

  [Action.DEPOSIT_RESERVE_ASSET]: (_, destLocation) => {
    return {
      DepositReserveAsset: {
        assets: {
          Wild: 'All',
        },
        dest: destLocation,
        xcm: [],
      },
    };
  },

  [Action.RECEIVE_TELEPORTED_ASSET]: (assetLocation: object) => {
    return {
      ReceiveTeleportedAsset: [
        {
          fun: {
            Fungible: '0',
          },
          id: {
            Concrete: assetLocation,
          },
        },
      ],
    };
  },

  [Action.RESERVE_ASSET_DEPOSITED]: (assetLocation: object) => {
    return {
      ReserveAssetDeposited: [
        {
          fun: {
            Fungible: '0',
          },
          id: {
            Concrete: assetLocation,
          },
        },
      ],
    };
  },

  [Action.BUY_EXECUTION]: (assetLocation: object) => {
    return {
      BuyExecution: {
        fees: {
          id: {
            Concrete: assetLocation,
          },
          fun: {
            Fungible: '0',
          },
        },
        weightLimit: {
          Unlimited: true,
        },
      },
    };
  },
};

export const estimateFeeFromApi = async (
  api: ApiPromise,
  instructions: Action[],
  assetLocation: object,
  destLocation: object,
) => {
  const pallet = api.tx.xcmPallet ? 'xcmPallet' : 'polkadotXcm';

  const xcmVersion = getTypeVersion(api, 'VersionedXcm');

  const message = {
    [xcmVersion]: instructions.map((i) => InstructionObjects[i](assetLocation, destLocation)),
  };

  let paymentInfo;

  try {
    paymentInfo = await api.tx[pallet].execute(message, 0).paymentInfo(TEST_ACCOUNTS[0]);
  } catch (e) {
    paymentInfo = await api.tx[pallet]
      .execute(message, {
        refTime: '0',
        proofSize: '0',
      })
      .paymentInfo(TEST_ACCOUNTS[0]);
  }

  return paymentInfo.partialFee;
};
