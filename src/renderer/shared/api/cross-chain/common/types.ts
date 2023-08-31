import { HexString } from '@renderer/domain/shared-kernel';

// =====================================================
// =========== ICrossChainService interface ============
// =====================================================

export interface ICrossChainService {
  fetchXcmConfig: () => Promise<XcmConfig>;
  getXcmConfig: () => XcmConfig | null;
  saveXcmConfig: (config: XcmConfig) => void;
}

// =====================================================
// ====================== General ======================
// =====================================================

export type XcmConfig = {
  assetLocation: AssetLocation;
  instructions: Instructions;
  networkBaseWeight: NetworkBaseWeight;
  chains: ChainXCM[];
};

type AssetLocation = {
  [asset: string]: {
    chainId: string;
    multiLocation: {
      parachainId?: number;
      generalKey?: HexString;
    };
    reserveFee: {
      instructions: keyof Instructions;
      mode: FeeMode;
    };
  };
};

type Instructions = {
  xtokensDest: ['reserveAssetDeposited', 'clearOrigin', 'buyExecution', 'depositAsset'];
  xtokensReserve: ['WithdrawAsset', 'ClearOrigin', 'BuyExecution', 'DepositReserveAsset'];
  xcmPalletDest: ['ReserveAssetDeposited', 'ClearOrigin', 'BuyExecution', 'DepositAsset'];
  xcmPalletTeleportDest: ['ReceiveTeleportedAsset', 'ClearOrigin', 'BuyExecution', 'DepositAsset'];
};

type FeeMode = {
  type: 'proportional';
  value: string;
};

type NetworkBaseWeight = {
  [token: string]: string;
};

type ChainXCM = {
  chainId: string;
  assets: {
    assetId: number;
    assetLocation: string;
    assetLocationPath: {
      type: PathType;
    };
    xcmTransfers: XcmTransfer[];
  }[];
};

type XcmTransfer = {
  type: XcmTransferType;
  destination: {
    chainId: string;
    assetId: number;
    fee: {
      mode: FeeMode;
      instructions: keyof Instructions;
    };
  };
};

type XcmTransferType = 'xtokens' | 'xcmpallet';
type PathType = 'absolute' | 'relative';

// const enum Action {
//   ReserveAssetDeposited = 'ReserveAssetDeposited',
//   WithdrawAsset = 'WithdrawAsset',
//   ReceiveTeleportedAsset = 'ReceiveTeleportedAsset',
//   ClearOrigin = 'ClearOrigin',
//   BuyExecution = 'BuyExecution',
//   DepositReserveAsset = 'DepositReserveAsset',
//   DepositAsset = 'DepositAsset',
// }
