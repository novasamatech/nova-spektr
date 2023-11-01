import { BN } from '@polkadot/util';
import { useEffect, useState, memo } from 'react';
import { ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';

import { AssetBalance } from '@renderer/entities/asset';
import { DecodedTransaction, Transaction } from '@renderer/entities/transaction';
import { Shimmering } from '@renderer/shared/ui';
import { estimateFee, XcmConfig } from '@renderer/shared/api/xcm';
import { toLocalChainId } from '@renderer/shared/lib/utils';
import type { Asset } from '@renderer/shared/core';
import { priceProviderModel } from '@renderer/entities/price';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';

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
      return (
        <div className="flex flex-col gap-y-0.5 items-end">
          <Shimmering width={90} height={20} data-testid="fee-loader" />
          {fiatFlag && <Shimmering width={70} height={18} data-testid="fee-loader" />}
        </div>
      );
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
