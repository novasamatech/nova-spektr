import { ApiPromise } from '@polkadot/api';

import { Icon, FootnoteText, Tooltip } from '@renderer/shared/ui';
import { Deposit, Fee } from '@renderer/components/common';
import { useI18n } from '@renderer/app/providers';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { MultisigAccount, Account, isMultisig } from '@renderer/domain/account';

type Props = {
  api: ApiPromise;
  asset: Asset;
  transaction: Transaction;
  account: Account | MultisigAccount;
  totalAccounts: number;
  onDepositChange: (value: string) => void;
  onFeeChange: (value: string) => void;
  onFeeLoading: (value: boolean) => void;
};

const OperationFooter = ({
  api,
  asset,
  transaction,
  account,
  totalAccounts,
  onDepositChange,
  onFeeChange,
  onFeeLoading,
}: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig(account) && (
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
          <Fee
            api={api}
            asset={asset}
            transaction={transaction}
            onFeeChange={onFeeChange}
            onFeeLoading={onFeeLoading}
          />
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
              transaction={transaction}
              onFeeChange={onFeeChange}
              onFeeLoading={onFeeLoading}
            />
          </FootnoteText>
        </div>
      )}
    </div>
  );
};

export default OperationFooter;
