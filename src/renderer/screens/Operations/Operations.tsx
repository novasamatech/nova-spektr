import { useState } from 'react';
import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { useI18n } from '@renderer/context/I18nContext';
import EmptyOperations from './components/EmptyState/EmptyOperations';
import { useAccount } from '@renderer/services/account/accountService';
import { MultisigAccount } from '@renderer/domain/account';
import Operation from './components/Operation';
import { sortByDate } from './common/utils';
import { FootnoteText } from '@renderer/components/ui-redesign';
import Filters from './components/Filters';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';

const Operations = () => {
  const { t, dateLocale } = useI18n();
  const { getActiveMultisigAccount } = useAccount();
  const { getLiveAccountMultisigTxs } = useMultisigTx();

  const account = getActiveMultisigAccount();
  const txs = getLiveAccountMultisigTxs(account?.accountId ? [account.accountId] : []);

  const [filteredTxs, setFilteredTxs] = useState<MultisigTransactionDS[]>(txs);

  const groupedTxs = groupBy(filteredTxs, ({ dateCreated }) =>
    format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  return (
    <div className="flex flex-col items-start relative bg-main-app-background min-h-full">
      <header className="w-full px-6 py-4.5 bg-top-nav-bar-background border-b border-container-border">
        <h1 className="font-semibold text-2xl text-neutral"> {t('operations.title')}</h1>
      </header>

      <div className="pl-6 mx-auto h-full">
        {Boolean(txs.length) && <Filters txs={txs} onChangeFilters={setFilteredTxs} />}

        <div className="overflow-y-auto flex-1 mx-auto pt-4">
          {Boolean(filteredTxs.length) &&
            Object.entries(groupedTxs)
              .sort(sortByDate)
              .map(([date, txs]) => (
                <section className="w-fit mt-6" key={date}>
                  <FootnoteText className="text-text-tertiary mb-3 ml-2">{date}</FootnoteText>
                  <ul className="flex flex-col gap-y-1.5">
                    {txs
                      .sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))
                      .map((tx) => (
                        <Operation key={tx.dateCreated} tx={tx} account={account as MultisigAccount} />
                      ))}
                  </ul>
                </section>
              ))}
        </div>

        {!filteredTxs.length && <EmptyOperations />}
      </div>
    </div>
  );
};

export default Operations;
