import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { AddressWithExplorers, WalletCardSm, WalletIcon, walletModel } from '@entities/wallet';
import { ChainTitle } from '@entities/chain';
import { ExtendedChain } from '@entities/network';
import { Transaction } from '@entities/transaction';
import { DetailRow, FootnoteText } from '@shared/ui';
import type { Account, MultisigAccount } from '@shared/core';

const AddressStyle = 'text-footnote text-inherit';

type Props = {
  transaction: Transaction;
  account?: Account | MultisigAccount;
  signatory?: Account;
  connection?: ExtendedChain;
};

const Details = ({ transaction, account, signatory, connection }: Props) => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);
  const signatoryWallet = wallets.find((w) => w.id === signatory?.walletId);

  const addressPrefix = connection?.addressPrefix;
  const explorers = connection?.explorers;

  return (
    <dl className="flex flex-col gap-y-4 w-full">
      {activeWallet && account && (
        <DetailRow label={t('operation.details.wallet')} className="flex gap-x-2">
          <WalletIcon type={activeWallet.type} size={16} />
          <FootnoteText className="pr-2">{activeWallet.name}</FootnoteText>
        </DetailRow>
      )}

      {account && (
        <DetailRow label={t('operation.details.sender')}>
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont={AddressStyle}
            accountId={account.accountId}
            addressPrefix={addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>
      )}

      {signatory && signatoryWallet && (
        <DetailRow label={t('transfer.signatoryLabel')}>
          <WalletCardSm
            wallet={signatoryWallet}
            accountId={signatory.accountId}
            addressPrefix={addressPrefix}
            explorers={explorers}
          />
        </DetailRow>
      )}

      <hr className="border-filter-border w-full pr-2" />

      {transaction?.args.destinationChain && (
        <DetailRow label={t('operation.details.destinationChain')}>
          <ChainTitle
            chainId={transaction.args.destinationChain}
            fontClass="text-text-primary text-footnote"
            className="px-2"
          />
        </DetailRow>
      )}

      {transaction?.args.dest && (
        <DetailRow label={t('operation.details.recipient')}>
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont={AddressStyle}
            address={transaction.args.dest}
            addressPrefix={addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>
      )}

      <hr className="border-filter-border w-full pr-2" />
    </dl>
  );
};

export default Details;
