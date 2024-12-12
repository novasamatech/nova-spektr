import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { type XcmConfig, xcmService } from '@/shared/api/xcm';
import { type Asset, type DecodedTransaction, type Transaction } from '@/shared/core';
import { toLocalChainId } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';
import { FeeLoader } from '../FeeLoader/FeeLoader';

type Props = {
  api: ApiPromise;
  multiply?: number;
  asset: Asset;
  config: XcmConfig;
  transaction?: Transaction | DecodedTransaction;
  className?: string;
  onFeeChange?: (fee: string) => void;
  onFeeLoading?: (loading: boolean) => void;
};

export const XcmFee = memo(
  ({ api, multiply = 1, config, asset, transaction, className, onFeeChange, onFeeLoading }: Props) => {
    const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

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

      const originChainId = transaction.chainId;
      const destinationChainId = transaction.args.destinationChain;
      const configChain = config.chains.find((c) => c.chainId === toLocalChainId(originChainId));
      const configAsset = configChain?.assets.find((a) => a.assetId === asset.assetId);
      const configXcmTransfer = configAsset?.xcmTransfers.find(
        (t) => t.destination.chainId === toLocalChainId(destinationChainId),
      );

      if (originChainId && configXcmTransfer && configAsset) {
        xcmService
          .getEstimatedFee(
            api,
            config,
            config.assetsLocation[configAsset.assetLocation],
            originChainId,
            configXcmTransfer,
            transaction.args.xcmAsset,
            transaction.args.xcmDest,
          )
          .then((fee) => fee.toString())
          .then(handleFee);
      } else {
        handleFee('0');
      }
    }, [transaction]);

    if (isLoading) {
      return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
    }

    const totalFee = new BN(fee).muln(multiply).toString();

    return (
      <div className="flex flex-col items-end gap-y-0.5">
        <AssetBalance value={totalFee} asset={asset} className={className} />
        <AssetFiatBalance asset={asset} amount={totalFee} />
      </div>
    );
  },
);
