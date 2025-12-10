import { PolkadotXcmError, PolkadotXcmExecutionError, XTokensError } from '@paraspell/sdk-pjs';

export type XcmErrorCategory = 'FeesNotMet' | 'TooExpensive' | 'Unsupported' | 'InsufficientBalance' | 'Unknown';

export type XcmErrorInfo = {
  category: XcmErrorCategory;
  isFeesNotMet: boolean;
  isTooExpensive: boolean;
  isUnsupported: boolean;
  isInsufficientBalance: boolean;
};

type ErrorConfig = {
  category: XcmErrorCategory;
  message: string;
};

const ERROR_CONFIGS: Record<string, ErrorConfig> = {
  [PolkadotXcmError.FeesNotMet]: {
    category: 'FeesNotMet',
    message: 'Insufficient funds to cover transaction fees',
  },
  [PolkadotXcmExecutionError.NotHoldingFees]: {
    category: 'FeesNotMet',
    message: 'Account does not hold sufficient funds to cover fees',
  },
  [XTokensError.FeeNotEnough]: {
    category: 'FeesNotMet',
    message: 'Fee amount is not sufficient for the transfer',
  },

  [PolkadotXcmExecutionError.TooExpensive]: {
    category: 'TooExpensive',
    message: 'The transfer amount is too small to cover the transaction fees',
  },

  [PolkadotXcmError.Unreachable]: {
    category: 'Unsupported',
    message: 'The destination chain is currently unreachable',
  },
  [PolkadotXcmError.SendFailure]: {
    category: 'Unsupported',
    message: 'Failed to send the XCM message',
  },
  [PolkadotXcmError.Filtered]: {
    category: 'Unsupported',
    message: 'The transfer was filtered by network policies',
  },
  [PolkadotXcmError.UnweighableMessage]: {
    category: 'Unsupported',
    message: 'The XCM message cannot be weighed',
  },
  [PolkadotXcmError.DestinationNotInvertible]: {
    category: 'Unsupported',
    message: 'The destination location cannot be inverted',
  },
  [PolkadotXcmError.CannotReanchor]: {
    category: 'Unsupported',
    message: 'Cannot reanchor the asset',
  },
  [PolkadotXcmError.BadVersion]: {
    category: 'Unsupported',
    message: 'Unsupported XCM version',
  },
  [PolkadotXcmError.BadLocation]: {
    category: 'Unsupported',
    message: 'Invalid asset location',
  },
  [PolkadotXcmError.InvalidOrigin]: {
    category: 'Unsupported',
    message: 'Invalid origin for the transfer',
  },
  [PolkadotXcmError.InvalidAssetUnknownReserve]: {
    category: 'Unsupported',
    message: 'Invalid asset with unknown reserve',
  },
  [PolkadotXcmError.InvalidAssetUnsupportedReserve]: {
    category: 'Unsupported',
    message: 'Invalid asset with unsupported reserve',
  },
  [PolkadotXcmExecutionError.DestinationUnsupported]: {
    category: 'Unsupported',
    message: 'The destination chain does not support this transfer',
  },
  [PolkadotXcmExecutionError.Unroutable]: {
    category: 'Unsupported',
    message: 'No valid route found to the destination chain',
  },
  [PolkadotXcmExecutionError.Transport]: {
    category: 'Unsupported',
    message: 'Transport error occurred during the transfer',
  },
  [PolkadotXcmExecutionError.Unimplemented]: {
    category: 'Unsupported',
    message: 'This operation is not implemented',
  },
  [PolkadotXcmExecutionError.UntrustedReserveLocation]: {
    category: 'Unsupported',
    message: 'Untrusted reserve location',
  },
  [PolkadotXcmExecutionError.UntrustedTeleportLocation]: {
    category: 'Unsupported',
    message: 'Untrusted teleport location',
  },
  [PolkadotXcmExecutionError.LocationFull]: {
    category: 'Unsupported',
    message: 'Location is full and cannot hold more assets',
  },
  [PolkadotXcmExecutionError.LocationNotInvertible]: {
    category: 'Unsupported',
    message: 'Location cannot be inverted',
  },
  [PolkadotXcmExecutionError.InvalidLocation]: {
    category: 'Unsupported',
    message: 'Invalid location specified',
  },
  [PolkadotXcmExecutionError.LocationCannotHold]: {
    category: 'Unsupported',
    message: 'Location cannot hold the asset',
  },
  [PolkadotXcmExecutionError.ExceedsMaxMessageSize]: {
    category: 'Unsupported',
    message: 'XCM message exceeds maximum size',
  },
  [PolkadotXcmExecutionError.Barrier]: {
    category: 'Unsupported',
    message: 'Transfer blocked by barrier',
  },
  [PolkadotXcmExecutionError.VersionIncompatible]: {
    category: 'Unsupported',
    message: 'XCM version incompatible',
  },
  [PolkadotXcmExecutionError.UnhandledXcmVersion]: {
    category: 'Unsupported',
    message: 'Unhandled XCM version',
  },
  [PolkadotXcmExecutionError.WeightNotComputable]: {
    category: 'Unsupported',
    message: 'Weight cannot be computed for this operation',
  },
  [PolkadotXcmExecutionError.ExceedsStackLimit]: {
    category: 'Unsupported',
    message: 'XCM execution exceeds stack limit',
  },
  [XTokensError.NotCrossChainTransfer]: {
    category: 'Unsupported',
    message: 'This is not a valid cross-chain transfer',
  },
  [XTokensError.NotCrossChainTransferableCurrency]: {
    category: 'Unsupported',
    message: 'This currency cannot be transferred cross-chain',
  },
  [XTokensError.NotSupportedLocation]: {
    category: 'Unsupported',
    message: 'The specified location is not supported for transfers',
  },
  [XTokensError.AssetHasNoReserve]: {
    category: 'Unsupported',
    message: 'Asset has no reserve',
  },
  [XTokensError.InvalidDest]: {
    category: 'Unsupported',
    message: 'Invalid destination address',
  },
  [XTokensError.XcmExecutionFailed]: {
    category: 'Unsupported',
    message: 'XCM execution failed',
  },
  [XTokensError.InvalidAncestry]: {
    category: 'Unsupported',
    message: 'Invalid ancestry',
  },
  [XTokensError.InvalidAsset]: {
    category: 'Unsupported',
    message: 'Invalid asset',
  },
  [XTokensError.DistinctReserveForAssetAndFee]: {
    category: 'Unsupported',
    message: 'Asset and fee require distinct reserves',
  },
  [XTokensError.ZeroFee]: {
    category: 'Unsupported',
    message: 'Fee cannot be zero',
  },
  [XTokensError.ZeroAmount]: {
    category: 'Unsupported',
    message: 'Transfer amount cannot be zero',
  },
  [XTokensError.TooManyAssetsBeingSent]: {
    category: 'Unsupported',
    message: 'Too many assets being sent',
  },
  [XTokensError.AssetIndexNonExistent]: {
    category: 'Unsupported',
    message: 'Asset index does not exist',
  },
  [XTokensError.MinXcmFeeNotDefined]: {
    category: 'Unsupported',
    message: 'Minimum XCM fee is not defined',
  },
  [XTokensError.RateLimited]: {
    category: 'Unsupported',
    message: 'Transfer rate limited',
  },

  [PolkadotXcmError.LowBalance]: {
    category: 'InsufficientBalance',
    message: 'Account balance is too low to complete the transfer',
  },
  [PolkadotXcmExecutionError.AssetNotFound]: {
    category: 'InsufficientBalance',
    message: 'The requested asset was not found',
  },
  [PolkadotXcmExecutionError.FailedToTransactAsset]: {
    category: 'InsufficientBalance',
    message: 'Failed to transact the asset',
  },
  [PolkadotXcmExecutionError.NotWithdrawable]: {
    category: 'InsufficientBalance',
    message: 'The asset cannot be withdrawn from the account',
  },
  [PolkadotXcmExecutionError.NotDepositable]: {
    category: 'InsufficientBalance',
    message: 'The asset cannot be deposited',
  },
  [PolkadotXcmExecutionError.Overflow]: {
    category: 'InsufficientBalance',
    message: 'Balance overflow occurred',
  },
  [PolkadotXcmExecutionError.HoldingWouldOverflow]: {
    category: 'InsufficientBalance',
    message: 'Holding would cause overflow',
  },
};

function getErrorConfig(errorCode: string): ErrorConfig | undefined {
  return ERROR_CONFIGS[errorCode];
}

export function normalizeXcmError(failureReason?: string, failureSubReason?: string): string {
  const subReason = failureSubReason?.trim();
  if (subReason) {
    return subReason;
  }

  const reason = failureReason?.trim();
  return reason || 'Unknown error occurred';
}

export function categorizeXcmError(error: string): XcmErrorInfo {
  const normalizedError = error.trim();
  const config = getErrorConfig(normalizedError);
  const category = config?.category || 'Unknown';

  return {
    category,
    isFeesNotMet: category === 'FeesNotMet',
    isTooExpensive: category === 'TooExpensive',
    isUnsupported: category === 'Unsupported',
    isInsufficientBalance: category === 'InsufficientBalance',
  };
}

export function getHumanReadableXcmError(error: string, failureChain?: string): string {
  const normalizedError = error.trim();

  const config = getErrorConfig(normalizedError);
  if (config) {
    if (failureChain && config.category === 'FeesNotMet') {
      if (failureChain === 'destination') {
        return 'Insufficient funds to cover fees on the destination network';
      }
      if (failureChain === 'origin') {
        return 'Insufficient funds to cover fees on the origin network';
      }
    }
    return config.message;
  }

  if (normalizedError.includes('Dry run failed:')) {
    return normalizedError.replace('Dry run failed:', '').trim();
  }

  if (normalizedError.includes('ModuleError')) {
    return 'Transaction failed due to a module error';
  }

  if (normalizedError.includes('VersionedConversionFailed')) {
    return 'Failed to convert XCM version';
  }

  return normalizedError || 'Unknown error occurred';
}
