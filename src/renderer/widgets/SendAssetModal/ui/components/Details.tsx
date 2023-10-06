import { useI18n } from '@renderer/app/providers';
import { AddressWithExplorers } from '@renderer/entities/wallet';
import { ChainTitle } from '@renderer/entities/chain';
import { ExtendedChain } from '@renderer/entities/network';
import { Transaction } from '@renderer/entities/transaction';
import { DetailRow } from '@renderer/shared/ui';
import type { Wallet, Account, MultisigAccount } from '@renderer/shared/core';

const AddressStyle = 'text-footnote text-inherit';

type Props = {
  transaction: Transaction;
  account?: Account | MultisigAccount;
  signatory?: Account;
  wallet: Wallet | null;
  connection?: ExtendedChain;
  withAdvanced?: boolean;
};

const Details = ({ transaction, wallet, account, signatory, connection, withAdvanced = true }: Props) => {
  const { t } = useI18n();

  const addressPrefix = connection?.addressPrefix;
  const explorers = connection?.explorers;

  const valueClass = withAdvanced ? 'text-text-secondary' : 'text-text-primary';

  return (
    <dl className="flex flex-col gap-y-4 w-full">
      {wallet && account && (
        <DetailRow label={t('operation.details.wallet')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            accountId={account.accountId}
            addressPrefix={addressPrefix}
            name={wallet.name}
          />
        </DetailRow>
      )}

      {account && (
        <DetailRow label={t('operation.details.sender')} className={valueClass}>
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont={AddressStyle}
            accountId={account.accountId}
            addressPrefix={addressPrefix}
          />
        </DetailRow>
      )}

      {signatory && (
        <DetailRow label={t('transfer.signatoryLabel')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            accountId={signatory.accountId}
            addressPrefix={addressPrefix}
            name={signatory.name}
          />
        </DetailRow>
      )}

      {transaction?.args.destinationChain && (
        <DetailRow label={t('operation.details.destinationChain')} className={valueClass}>
          <ChainTitle chainId={transaction.args.destinationChain} fontClass="text-text-primary text-footnote" />
        </DetailRow>
      )}

      {transaction?.args.dest && (
        <DetailRow label={t('operation.details.recipient')} className={valueClass}>
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont={AddressStyle}
            address={transaction.args.dest}
            addressPrefix={addressPrefix}
          />
        </DetailRow>
      )}
    </dl>
  );
};

export default Details;
