import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { useI18n } from '@renderer/context/I18nContext';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import EmptyOperations from './components/EmptyState/EmptyOperations';
import { SigningType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { nonNullable } from '@renderer/shared/utils/functions';
import { MultisigAccount } from '@renderer/domain/account';
import Operation from './components/Operation';
import { sortByDate } from './common/utils';
import { FootnoteText } from '@renderer/components/ui-redesign';

const Operations = () => {
  const { t, dateLocale } = useI18n();

  const { getLiveAccountMultisigTxs } = useMultisigTx();
  const { getActiveAccounts } = useAccount();

  const accounts = getActiveAccounts({ signingType: SigningType.MULTISIG });
  const accountsMap = new Map(accounts.map((account) => [account.publicKey, account as MultisigAccount]));
  const publicKeys = accounts.map((a) => a.publicKey).filter(nonNullable);

  const txs = getLiveAccountMultisigTxs(publicKeys);

  const groupedTxs = groupBy(
    txs.filter((tx) => accounts.find((a) => a.publicKey === tx.publicKey)),
    ({ dateCreated }) => format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  return (
    <div className="h-full flex flex-col items-start relative">
      <header className="w-full px-6 py-4.5 bg-top-nav-bar-background border-b border-container-border pl-6">
        <h1 className="font-semibold text-2xl text-neutral"> {t('operations.title')}</h1>
      </header>

      <div className="overflow-y-auto flex-1 mx-auto w-full bg-main-app-background pl-6 pt-4">
        {txs.length ? (
          Object.entries(groupedTxs)
            .sort(sortByDate)
            .map(([date, txs]) => (
              <section className="w-fit mt-6" key={date}>
                <FootnoteText className="text-text-tertiary mb-3 ml-2">{date}</FootnoteText>
                <ul className="flex flex-col gap-y-1.5">
                  {txs
                    .sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))
                    .map((tx) => (
                      <Operation key={tx.id} tx={tx} account={accountsMap.get(tx.publicKey)} />
                    ))}
                </ul>
              </section>
            ))
        ) : (
          <EmptyOperations />
        )}
      </div>
    </div>
  );
};

export default Operations;
