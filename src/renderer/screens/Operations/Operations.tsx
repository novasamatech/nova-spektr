import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { Block, Plate, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';
import EmptyOperations from './components/EmptyState/EmptyOperations';
import { SigningType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { nonNullable } from '@renderer/shared/utils/functions';
import { MultisigAccount } from '@renderer/domain/account';
import Operation from './components/Operation';
import { sortByDate } from './common/utils';

const Operations = () => {
  const { t, dateLocale } = useI18n();

  const { getActiveAccounts } = useAccount();
  const { getLiveAccountMultisigTxs } = useMultisigTx();

  const accounts = getActiveAccounts({ signingType: SigningType.MULTISIG });
  const accountsMap = new Map(accounts.map((account) => [account.accountId, account as MultisigAccount]));
  const accountIds = accounts.map((a) => a.accountId).filter(nonNullable);

  const txs = getLiveAccountMultisigTxs(accountIds);

  const groupedTxs = groupBy(
    txs.filter((tx) => accounts.find((a) => a.accountId === tx.accountId)),
    ({ dateCreated }) => format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  return (
    <div className="h-full flex flex-col gap-y-9 relative">
      <div className="flex items-center gap-x-2.5 mt-5 px-5">
        <h1 className="font-semibold text-2xl text-neutral"> {t('operations.title')}</h1>
      </div>

      <div className="overflow-y-auto flex-1">
        <Plate as="section" className="mx-auto w-[800px]">
          <h2 className="text-lg font-bold mb-4">{t('operations.subTitle')}</h2>
          {txs.length ? (
            Object.entries(groupedTxs)
              .sort(sortByDate)
              .map(([date, txs]) => (
                <div key={date}>
                  <div className="text-shade-30">{date}</div>
                  <Block className="p-1.5">
                    <Table by="id" dataSource={txs.sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))}>
                      <Table.Header hidden={true}>
                        <Table.Column width={100} dataKey="dateCreated" align="left" />
                        <Table.Column dataKey="callData" align="left" />
                        <Table.Column dataKey="transaction" align="right" />
                        <Table.Column width={100} dataKey="chainId" align="left" />
                        <Table.Column width={150} dataKey="signatories" align="right" />
                        <Table.Column width={20} dataKey="chevron" align="right" />
                      </Table.Header>

                      <Table.Body<MultisigTransactionDS>>
                        {(tx) => <Operation key={tx.id} tx={tx} account={accountsMap.get(tx.accountId)} />}
                      </Table.Body>
                    </Table>
                  </Block>
                </div>
              ))
          ) : (
            <EmptyOperations />
          )}
        </Plate>
      </div>
    </div>
  );
};

export default Operations;
