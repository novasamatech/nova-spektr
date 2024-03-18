import { BN } from '@polkadot/util';
import { useEffect, useState, memo } from 'react';
import { ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';

import { AssetBalance } from '@entities/asset';
import { DecodedTransaction, FeeLoader, Transaction } from '@entities/transaction';
import { XcmConfig, xcmService } from '@shared/api/xcm';
import { toLocalChainId } from '@shared/lib/utils';
import type { Asset } from '@shared/core';
import { priceProviderModel } from '@entities/price';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';

type Props = {
  api?: ApiPromise;
  multiply?: number;
  asset: Asset;
  config: XcmConfig;
  transaction?: Transaction | DecodedTransaction;
  className?: string;
  onFeeChange?: (fee: string) => void;
  onFeeLoading?: (loading: boolean) => void;
};

export const XcmFee = memo(
  ({ multiply = 1, config, asset, transaction, className, onFeeChange, onFeeLoading, api }: Props) => {
    const [fee, setFee] = useState('0');
    const [isLoading, setIsLoading] = useState(false);
    const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

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
        xcmService
          .getEstimatedFee(
            config,
            config.assetsLocation[configAsset.assetLocation],
            originChainId,
            configXcmTransfer,
            api,
            transaction.args.xcmAsset,
            transaction.args.xcmDest,
          )
          .then((fee) => handleFee(fee.toString()));
      } else {
        handleFee('0');
      }
    }, [transaction]);

    if (isLoading) {
      return <FeeLoader fiatFlag={!!fiatFlag} />;
    }

    const totalFee = new BN(fee).muln(multiply).toString();

    return (
      <div className="flex flex-col gap-y-0.5 items-end">
        <AssetBalance value={totalFee} asset={asset} className={className} />
        <AssetFiatBalance asset={asset} amount={totalFee} />
      </div>
    );
  },
);
