import { useCallback } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { Account, MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { Transaction } from '@renderer/domain/transaction';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';
import DetailWithLabel, { DetailWithLabelProps } from '@renderer/components/common/DetailsWithLabel/DetailWithLabel';
import { AddressStyle } from '../common/constants';
import { Wallet } from '@renderer/domain/wallet';

type Props = {
  transaction: Transaction;
  account?: Account | MultisigAccount;
  signatory?: Account;
  wallet?: Wallet;
  connection?: ExtendedChain;
  withAdvanced?: boolean;
};

const Details = ({ transaction, wallet, account, signatory, connection, withAdvanced = true }: Props) => {
  const { t } = useI18n();

  const addressPrefix = connection?.addressPrefix;
  const explorers = connection?.explorers;

  const valueClass = withAdvanced ? 'text-text-secondary' : 'text-text-primary';
  const DetailsRow = useCallback(
    (props: DetailWithLabelProps) => <DetailWithLabel {...props} className={valueClass} />,
    [valueClass],
  );

  return (
    <>
      <dl className="flex flex-col gap-y-4 w-full">
        {wallet && account && (
          <DetailsRow label={t('operation.details.wallet')}>
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              accountId={account.accountId}
              addressPrefix={addressPrefix}
              name={wallet.name}
            />
          </DetailsRow>
        )}

        {account && (
          <DetailsRow label={t('operation.details.sender')}>
            <AddressWithExplorers
              type="short"
              explorers={explorers}
              addressFont={AddressStyle}
              accountId={account.accountId}
              addressPrefix={addressPrefix}
            />
          </DetailsRow>
        )}

        {signatory && (
          <DetailsRow label={t('transfer.signatoryLabel')}>
            <AddressWithExplorers
              explorers={explorers}
              addressFont={AddressStyle}
              accountId={signatory.accountId}
              addressPrefix={addressPrefix}
              name={signatory.name}
            />
          </DetailsRow>
        )}

        {transaction?.args.dest && (
          <DetailsRow label={t('operation.details.recipient')}>
            <AddressWithExplorers
              type="short"
              explorers={explorers}
              addressFont={AddressStyle}
              address={transaction.args.dest}
              addressPrefix={addressPrefix}
            />
          </DetailsRow>
        )}
      </dl>
    </>
  );
};

export default Details;
