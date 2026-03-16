import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { spellXcmService } from '@/shared/api/xcm';
import { type Asset, type ChainId, type DecodedTransaction, type Transaction } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { AssetBalance } from '@/shared/ui-entities';
import { priceProviderModel } from '@/domains/price';
import { networkModel } from '@/entities/network';
// eslint-disable-next-line boundaries/element-types
import { AssetFiatBalance } from '@/widgets/price';
import { FeeLoader } from '../FeeLoader/FeeLoader';

type Props = {
  api: ApiPromise;
  multiply?: number;
  asset: Asset;
  transaction?: Transaction | DecodedTransaction | null;
  className?: string;
  onFeeChange?: (fee: BN) => void;
  onFeeLoading?: (loading: boolean) => void;
  fee?: BN | null;
  isLoading?: boolean;
};

export const XcmFee = memo(
  ({
    api,
    multiply = 1,
    asset,
    transaction,
    className,
    onFeeChange,
    onFeeLoading,
    fee: externalFee,
    isLoading: externalIsLoading,
  }: Props) => {
    const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
    const chains = useUnit(networkModel.$chains);
    const apis = useUnit(networkModel.$apis);

    const [fee, setFee] = useState(BN_ZERO);
    const [isLoading, setIsLoading] = useState(false);

    const updateFee = (fee: BN) => {
      setFee(fee);
      onFeeChange?.(fee);
    };

    useEffect(() => {
      const loading = externalIsLoading !== undefined ? externalIsLoading : isLoading;
      onFeeLoading?.(loading);
    }, [isLoading, externalIsLoading, onFeeLoading]);

    useEffect(() => {
      if (externalFee !== undefined && externalFee !== null) {
        updateFee(externalFee);
        if (externalIsLoading !== undefined) {
          setIsLoading(externalIsLoading);
        }
        return;
      }

      const handleFee = (fee: BN) => {
        updateFee(fee);
        setIsLoading(false);
      };

      setIsLoading(true);
      if (!transaction?.accountId || !transaction.args.destinationChain) {
        handleFee(BN_ZERO);
        return;
      }

      const originChain = chains[transaction.chainId];
      const destinationChain = chains[transaction.args.destinationChain as ChainId];

      if (!originChain || !destinationChain) {
        handleFee(BN_ZERO);
        return;
      }

      const fromChainApi = apis[transaction.chainId];
      const toChainApi = apis[transaction.args.destinationChain as ChainId];

      if (!fromChainApi || !toChainApi) {
        handleFee(BN_ZERO);
        return;
      }

      const builderConfig = spellXcmService.createBuilderConfig(
        originChain,
        destinationChain,
        fromChainApi,
        toChainApi,
      );

      if (Object.keys(builderConfig.apiOverrides).length === 0) {
        handleFee(BN_ZERO);
        return;
      }

      const amount = transaction.args.value;
      const destination = transaction.args.dest || transaction.accountId.toString();
      const senderAddress = transaction.accountId
        ? toAddress(transaction.accountId, { prefix: originChain.addressPrefix })
        : undefined;

      spellXcmService
        .getXcmFees({
          fromChain: originChain,
          toChain: destinationChain,
          asset,
          amount,
          destinationAddress: destination,
          senderAddress,
          fromChainApi,
          toChainApi,
        })
        .then((fees) => {
          handleFee(fees?.destinationFee || BN_ZERO);
        })
        .catch(() => {
          handleFee(BN_ZERO);
        });
    }, [transaction, chains, apis, api, asset, externalFee, externalIsLoading]);

    const loading = externalIsLoading !== undefined ? externalIsLoading : isLoading;
    if (loading) {
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
