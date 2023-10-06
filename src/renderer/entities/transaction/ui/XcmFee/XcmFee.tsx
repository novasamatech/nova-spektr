import { BN } from '@polkadot/util';
import { useEffect, useState, memo } from 'react';
import { ApiPromise } from '@polkadot/api';

import { AssetBalance } from '@renderer/entities/asset';
import { Transaction } from '@renderer/entities/transaction';
import { Shimmering } from '@renderer/shared/ui';
import { estimateFee, XcmConfig } from '@renderer/shared/api/xcm';
import { toLocalChainId } from '@renderer/shared/lib/utils';
import type { Asset } from '@renderer/shared/core';

type Props = {
  api?: ApiPromise;
  multiply?: number;
  asset: Asset;
  config: XcmConfig;
  transaction?: Transaction;
  className?: string;
  onFeeChange?: (fee: string) => void;
  onFeeLoading?: (loading: boolean) => void;
};

export const XcmFee = memo(
  ({ multiply = 1, config, asset, transaction, className, onFeeChange, onFeeLoading, api }: Props) => {
    const [fee, setFee] = useState('0');
    const [isLoading, setIsLoading] = useState(false);

    const updateFee = (fee: string) => {
      setFee(fee);
      onFeeChange?.(fee);
    };

    useEffect(() => {
      onFeeLoading?.(isLoading);
    }, [isLoading]);

    useEffect(() => {
      const handleFee = (fee: string) => {
        updateFee(fee);
        setIsLoading(false);
      };

      setIsLoading(true);
      if (!transaction?.address) {
        handleFee('0');

        return;
      }

      const originChainId = toLocalChainId(transaction.chainId);
      const destinationChainId = toLocalChainId(transaction.args.destinationChain);
      const configChain = config.chains.find((c) => c.chainId === originChainId);
      const configAsset = configChain?.assets.find((a) => a.assetId === asset.assetId);
      const configXcmTransfer = configAsset?.xcmTransfers.find((t) => t.destination.chainId === destinationChainId);

      if (originChainId && configXcmTransfer && configAsset) {
        estimateFee(
          config,
          config.assetsLocation[configAsset.assetLocation],
          originChainId,
          configXcmTransfer,
          api,
          transaction.args.xcmAsset,
          transaction.args.xcmDest,
        ).then((fee) => handleFee(fee.toString()));
      } else {
        handleFee('0');
      }
    }, [transaction]);

    if (isLoading) {
      return <Shimmering width={90} height={20} data-testid="fee-loader" />;
    }

    const totalFee = new BN(fee).muln(multiply).toString();

    return <AssetBalance value={totalFee} asset={asset} className={className} />;
  },
);
