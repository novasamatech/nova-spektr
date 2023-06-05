import { useState } from 'react';
import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { useI18n } from '@renderer/context/I18nContext';
import EmptyOperations from './components/EmptyState/EmptyOperations';
import { useAccount } from '@renderer/services/account/accountService';
import { MultisigAccount } from '@renderer/domain/account';
import Operation from './components/Operation';
import { sortByDateDesc } from './common/utils';
import { FootnoteText } from '@renderer/components/ui-redesign';
import Filters from './components/Filters';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { Header } from '@renderer/components/common';

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
      <Header title={t('operations.title')} />

      <div className="pl-6 mx-auto h-full">
        {Boolean(txs.length) && <Filters txs={txs} onChangeFilters={setFilteredTxs} />}

        <div className="overflow-y-auto flex-1 mx-auto pt-4">
          {Boolean(filteredTxs.length) &&
            Object.entries(groupedTxs)
              .sort(sortByDateDesc)
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
      </div>
      {!filteredTxs.length && (
        <EmptyOperations multisigAccount={account} isEmptyFromFilters={txs.length !== filteredTxs.length} />
      )}
    </div>
  );
};

export default Operations;
