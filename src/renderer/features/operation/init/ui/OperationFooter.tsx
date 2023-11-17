import { ApiPromise } from '@polkadot/api';

import { Icon, FootnoteText, Tooltip } from '@shared/ui';
import { useI18n } from '@app/providers';
import { Transaction, Deposit, Fee, XcmTypes } from '@entities/transaction';
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
        <div className="flex justify-between items-center gap-x-2">
          <div className="flex items-center gap-x-1">
            <Icon className="text-text-tertiary" name="lock" size={12} />
            <FootnoteText className="text-text-tertiary">{t('staking.networkDepositLabel')}</FootnoteText>
            <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90} pointer="down">
              <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
            </Tooltip>
          </div>
          <FootnoteText>
            <Deposit api={api} asset={asset} threshold={account.threshold} onDepositChange={onDepositChange} />
          </FootnoteText>
        </div>
      )}

      <div className="flex justify-between items-center gap-x-2">
        <FootnoteText className="text-text-tertiary">{t('staking.networkFee', { count: totalAccounts })}</FootnoteText>
        <FootnoteText className="text-text-tertiary">
          <Fee api={api} asset={asset} transaction={feeTx} onFeeChange={onFeeChange} onFeeLoading={onFeeLoading} />
        </FootnoteText>
      </div>

      {totalAccounts > 1 && (
        <div className="flex justify-between items-center gap-x-2">
          <FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>
          <FootnoteText className="text-text-tertiary">
            <Fee
              api={api}
              asset={asset}
              multiply={totalAccounts}
              transaction={feeTx}
              onFeeChange={onFeeChange}
              onFeeLoading={onFeeLoading}
            />
          </FootnoteText>
        </div>
      )}

      {isXcmTransfer && xcmConfig && xcmAsset && (
        <div className="flex justify-between items-center gap-x-2">
          <FootnoteText className="text-text-tertiary">{t('operation.xcmFee')}</FootnoteText>
          <FootnoteText className="text-text-tertiary">
            <XcmFee
              asset={xcmAsset}
              transaction={feeTx}
              config={xcmConfig}
              api={reserveApi}
              onFeeChange={onXcmFeeChange}
              onFeeLoading={onFeeLoading}
            />
          </FootnoteText>
        </div>
      )}
    </div>
  );
};
