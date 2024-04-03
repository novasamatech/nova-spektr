import { ApiPromise } from '@polkadot/api';

import { FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { Transaction, XcmTypes, FeeWithLabel, MultisigDepositWithLabel } from '@entities/transaction';
import { XcmConfig } from '@shared/api/xcm';
import { XcmFee } from '@entities/transaction/ui/XcmFee/XcmFee';
import type { Asset, Account } from '@shared/core';
import { accountUtils } from '@entities/wallet';

type Props = {
  api: ApiPromise;
  reserveApi?: ApiPromise;
  asset: Asset;
  feeTx?: Transaction;
  account: Account;
  totalAccounts: number;
  xcmConfig?: XcmConfig;
  xcmAsset?: Asset;
  onXcmFeeChange?: (value: string) => void;
  onDepositChange: (value: string) => void;
  onFeeChange: (value: string) => void;
  onFeeLoading: (value: boolean) => void;
};

export const OperationFooter = ({
  api,
  asset,
  feeTx,
  account,
  totalAccounts,
  xcmConfig,
  xcmAsset,
  reserveApi,
  onXcmFeeChange,
  onDepositChange,
  onFeeChange,
  onFeeLoading,
}: Props) => {
  const { t } = useI18n();

  // TODO: Check why transaction can be empty
  const isXcmTransfer = feeTx && XcmTypes.includes(feeTx.type);

  return (
    <div className="flex flex-col gap-y-2">
      {account && accountUtils.isMultisigAccount(account) && (
        <MultisigDepositWithLabel
          api={api}
          asset={asset}
          threshold={account.threshold}
          onDepositChange={onDepositChange}
        />
      )}

      <FeeWithLabel
        label={t('staking.networkFee', { count: totalAccounts })}
        api={api}
        asset={asset}
        multiply={totalAccounts}
        transaction={feeTx}
        onFeeChange={onFeeChange}
        onFeeLoading={onFeeLoading}
      />

      {totalAccounts > 1 && (
        <FeeWithLabel
          label={t('staking.networkFeeTotal')}
          api={api}
          asset={asset}
          multiply={totalAccounts}
          transaction={feeTx}
          onFeeChange={onFeeChange}
          onFeeLoading={onFeeLoading}
        />
      )}

      {isXcmTransfer && xcmConfig && xcmAsset && reserveApi && (
        <div className="flex justify-between items-center gap-x-2">
          <FootnoteText className="text-text-tertiary">{t('operation.xcmFee')}</FootnoteText>
          <FootnoteText className="text-text-tertiary">
            <XcmFee
              api={reserveApi}
              asset={xcmAsset}
              transaction={feeTx}
              config={xcmConfig}
              onFeeChange={onXcmFeeChange}
              onFeeLoading={onFeeLoading}
            />
          </FootnoteText>
        </div>
      )}
    </div>
  );
};
