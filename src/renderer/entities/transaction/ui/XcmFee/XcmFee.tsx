import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useEffect, useState, memo } from 'react';

import { Asset, AssetBalance } from '@renderer/entities/asset';
import { Transaction } from '@renderer/entities/transaction';
import { Shimmering } from '@renderer/shared/ui';
import { XcmConfig, estimateFee } from '@renderer/shared/api/xcm';

type Props = {
  api: ApiPromise;
  multiply?: number;
  asset: Asset;
  config: XcmConfig;
  transaction?: Transaction;
  className?: string;
  onFeeChange?: (fee: string) => void;
  onFeeLoading?: (loading: boolean) => void;
};

export const XcmFee = memo(
  ({ api, multiply = 1, config, asset, transaction, className, onFeeChange, onFeeLoading }: Props) => {
    const [fee, setFee] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const updateFee = (fee: string) => {
      setFee(fee);
      onFeeChange?.(fee);
    };

    useEffect(() => {
      onFeeLoading?.(isLoading);
    }, [isLoading]);

    useEffect(() => {
      setIsLoading(true);

      if (!transaction?.address) {
        updateFee('0');
        setIsLoading(false);
      } else {
        const originChainId = transaction.chainId.replace('0x', '');
        const destinationChainId = transaction.args.destinationChain.replace('0x', '');
        const configChain = config.chains.find((c) => c.chainId === originChainId);
        const configAsset = configChain?.assets.find((a) => a.assetId === asset.assetId);
        const configXcmTransfer = configAsset?.xcmTransfers.find((t) => t.destination.chainId === destinationChainId);

        if (configXcmTransfer && configAsset) {
          const fee = estimateFee(
            config,
            config.assetsLocation[configAsset.assetLocation],
            originChainId,
            configXcmTransfer,
          );
          updateFee(fee.toString());
        } else {
          updateFee('0');
        }

        setIsLoading(false);
      }
    }, [transaction, api]);

    if (isLoading) {
      return <Shimmering width={90} height={20} data-testid="fee-loader" />;
    }

    const totalFee = new BN(fee).muln(multiply).toString();

    return <AssetBalance value={totalFee} asset={asset} className={className} />;
  },
);
