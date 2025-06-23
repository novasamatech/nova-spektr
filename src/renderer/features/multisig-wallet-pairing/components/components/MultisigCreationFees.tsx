import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { type Asset, type MultisigThreshold, type Transaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { priceProviderModel } from '@/entities/price';
import { FeeLoader, transactionService } from '@/entities/transaction';

type Props = {
  api?: ApiPromise;
  asset: Asset;
  threshold: MultisigThreshold;
  className?: string;
  onDepositChange?: (deposit: string) => void;
  transaction?: Transaction;
};

export const MultisigCreationFees = memo(({ api, asset, threshold, onDepositChange, transaction }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const [isNetworkFeeLoading, setIsNetworkFeeLoading] = useState(true);
  const [isDepositLoading, setIsDepositLoading] = useState(true);

  const [deposit, setDeposit] = useState<BN>(BN_ZERO);
  const [networkFee, setNetworkFee] = useState<BN>(BN_ZERO);
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
      .then(fee => setNetworkFee(new BN(fee)))
      .catch(error => {
        setNetworkFee(BN_ZERO);
        console.info('Error getting fee - ', error);
      })
      .finally(() => setIsNetworkFeeLoading(false));
  }, [api]);

  if (isLoading) {
    return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
  }

  return (
    <div className="flex items-center gap-x-2">
      <FootnoteText className="text-text-tertiary">{t('createMultisigAccount.networkFee')}</FootnoteText>

      <AssetBalance value={fee.toString()} asset={asset} />
      <Icon size={16} name="edit" className="text-icon-default" />
    </div>
  );
});
