import { useEffect, useState } from 'react';
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
import { useNetworkContext } from '@renderer/context/NetworkContext';

const Operations = () => {
  const { t, dateLocale } = useI18n();
  const { getActiveMultisigAccount } = useAccount();
  const { getLiveAccountMultisigTxs } = useMultisigTx();
  const { connections } = useNetworkContext();

  const account = getActiveMultisigAccount();
  const allTxs = getLiveAccountMultisigTxs(account?.accountId ? [account.accountId] : []);

  const [txs, setTxs] = useState<MultisigTransactionDS[]>([]);
  const [filteredTxs, setFilteredTxs] = useState<MultisigTransactionDS[]>([]);

  const groupedTxs = groupBy(filteredTxs, ({ dateCreated }) =>
    format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  useEffect(() => {
    setTxs(allTxs.filter((tx) => connections[tx.chainId]));
  }, [allTxs]);

  return (
    <div className="flex flex-col items-center relative h-full">
      <Header title={t('operations.title')} />

      {Boolean(txs.length) && <Filters txs={txs} onChangeFilters={setFilteredTxs} />}

      {Boolean(filteredTxs.length) && (
        <div className="pl-6 overflow-y-auto w-full mt-4 h-full flex flex-col items-center">
          {Object.entries(groupedTxs)
            .sort(sortByDateDesc)
            .map(([date, txs]) => (
              <section className="w-fit mt-6" key={date}>
                <FootnoteText className="text-text-tertiary mb-3 ml-2">{date}</FootnoteText>
                <ul className="flex flex-col gap-y-1.5">
                  {txs
                    .sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))
                    .map((tx) => (
                      <li key={tx.dateCreated}>
                        <Operation tx={tx} account={account as MultisigAccount} />
                      </li>
                    ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      {!filteredTxs.length && (
        <EmptyOperations multisigAccount={account} isEmptyFromFilters={txs.length !== filteredTxs.length} />
      )}
    </div>
  );
};

export default Operations;
