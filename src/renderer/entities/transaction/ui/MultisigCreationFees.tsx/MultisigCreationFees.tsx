import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/app/providers';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon, Tooltip } from '@/shared/ui';
import { type Asset, type MultisigThreshold, type Transaction } from '@shared/core';
import { AssetBalance } from '@entities/asset';
import { priceProviderModel } from '@entities/price';
import { FeeLoader, transactionService } from '@entities/transaction';

type Props = {
  api?: ApiPromise;
  asset: Asset;
  threshold: MultisigThreshold;
  className?: string;
  onDepositChange?: (deposit: string) => void;
  wrapperClassName?: string;
  transaction?: Transaction;
};

export const MultisigCreationFees = memo(
  ({ api, asset, threshold, onDepositChange, wrapperClassName, transaction }: Props) => {
    const { t } = useI18n();

    const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

    const [isNetworkFeeLoading, setIsNetworkFeeLoading] = useState(true);
    const [isDepositLoading, setIsDepositLoading] = useState(true);

    const [deposit, setDeposit] = useState<BN>(BN_ZERO);
    const [networkFee, setNeworkFee] = useState<BN>(BN_ZERO);
    const fee = useMemo(() => deposit.add(networkFee), [deposit, networkFee]);
    const isLoading = useMemo(() => isNetworkFeeLoading || isDepositLoading, [isNetworkFeeLoading, isDepositLoading]);
    useEffect(() => {
      if (!api) {
        return;
      }

      setIsDepositLoading(true);
      const txDeposit = transactionService.getMultisigDeposit(threshold, api);

      setDeposit(new BN(txDeposit));
      setIsDepositLoading(false);
      onDepositChange?.(txDeposit);
    }, [threshold, api]);

    useEffect(() => {
      if (!api || !transaction) return;

      setIsNetworkFeeLoading(true);
      transactionService
        .getTransactionFee(transaction, api)
        .then((fee) => setNeworkFee(new BN(fee)))
        .catch((error) => {
          setNeworkFee(BN_ZERO);
          console.info('Error getting fee - ', error);
        })
        .finally(() => setIsNetworkFeeLoading(false));
    }, []);

    if (isLoading) {
      return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
    }

    return (
      <DetailRow
        label={
          <>
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.multisigCreationFeeLabel')}
            </FootnoteText>
            <Tooltip
              content={
                <div className="text-text-tertiary">
                  <div>
                    {t('createMultisigAccount.multisigDeposit')}
                    <AssetBalance value={deposit} asset={asset} className="ml-1 text-text-tertiary" />
                  </div>
                  <div>
                    {t('createMultisigAccount.networkFee')}
                    <AssetBalance value={networkFee} asset={asset} className="ml-1 text-text-tertiary" />
                  </div>
                </div>
              }
              offsetPx={-70}
            >
              <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
            </Tooltip>
          </>
        }
        className={cnTw('text-text-primary', wrapperClassName)}
        wrapperClassName="w-auto mr-1"
      >
        <div className="ml-1 flex flex-col items-end gap-y-0.5">
          <AssetBalance value={fee.toString()} asset={asset} className="" />
        </div>
      </DetailRow>
    );
  },
);
