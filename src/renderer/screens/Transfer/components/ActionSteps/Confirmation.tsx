import { useEffect, useState } from 'react';

import { Transaction } from '@renderer/domain/transaction';
import TransactionAmount from '@renderer/screens/Operations/components/TransactionAmount';
import { Button, FootnoteText } from '@renderer/components/ui-redesign';
import { Fee, DetailRow, DepositWithLabel } from '@renderer/components/common';
import { Account, MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import Details from '../Details';
import { Icon } from '@renderer/components/ui';
import { Wallet } from '@renderer/domain/wallet';
import { useWallet } from '@renderer/services/wallet/walletService';

const AmountFontStyle = 'font-manrope text-text-primary text-[32px] leading-[36px] font-bold';

type Props = {
  transaction: Transaction;
  account: Account | MultisigAccount;
  signatory?: Account;
  description?: string;
  connection: ExtendedChain;
  feeTx?: Transaction;
  onResult?: () => void;
  onBack?: () => void;
};

const Confirmation = ({ account, connection, transaction, signatory, description, feeTx, onResult, onBack }: Props) => {
  const { t } = useI18n();

  const { getWallet } = useWallet();

  const [feeLoaded, setFeeLoaded] = useState(false);
  const [wallet, setWallet] = useState<Wallet>();

  useEffect(() => {
    account.walletId && getWallet(account.walletId).then((wallet) => setWallet(wallet));
  }, [account]);

  return (
    <div className="flex flex-col items-center pt-4 gap-y-3">
      {transaction && <TransactionAmount tx={transaction} showIcon={false} className={AmountFontStyle} />}

      {description && (
        <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
          {description}
        </FootnoteText>
      )}

      <Details
        transaction={transaction}
        account={account}
        wallet={wallet}
        signatory={signatory}
        connection={connection}
        withAdvanced={false}
      />

      <hr className="border-divider my-1 w-full" />

      <DetailRow label={t('operation.networkFee')} className="text-text-primary">
        {connection.api && feeTx && (
          <Fee
            className="text-footnote text-text-primary"
            api={connection.api}
            asset={connection.assets[0]}
            transaction={feeTx}
            onFeeChange={(fee) => setFeeLoaded(Boolean(fee))}
          />
        )}
      </DetailRow>

      {signatory && connection.api && (
        <DepositWithLabel
          api={connection.api}
          asset={connection.assets[0]}
          threshold={(account as MultisigAccount).threshold}
        />
      )}

      <div className="flex w-full justify-between mt-5">
        <Button variant="text" onClick={onBack}>
          {t('operation.goBackButton')}
        </Button>

        <Button disabled={!feeLoaded} prefixElement={<Icon name="vault" size={14} />} onClick={onResult}>
          {t('operation.signButton')}
        </Button>
      </div>
    </div>
  );
};

export default Confirmation;
