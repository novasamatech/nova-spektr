import { groupBy } from 'lodash';

import { Block, Plate, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { MultisigEvent } from '@renderer/domain/transaction';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';
import Chain from './components/Chain';
import ShortTransactionInfo from './components/ShortTransactionInfo';
import TransactionTitle from './components/TransactionTitle';
import EmptyOperations from './components/EmptyState/EmptyOperations';

const Operations = () => {
  const { t } = useI18n();

  const { getLiveMultisigTxs } = useMultisigTx();

  const txs = getLiveMultisigTxs({ status: 'SIGNING' });

  const getApprovalsAmount = (events: MultisigEvent[]) => {
    return events.filter((e) => e.status === 'SIGNED').length;
  };

  const groupedTxs = groupBy(txs.reverse(), (tx) => new Date(tx.dateCreated || 0).toLocaleDateString());

  return (
    <div className="h-full flex flex-col gap-y-9 relative">
      <div className="flex items-center gap-x-2.5 mt-5 px-5">
        <h1 className="font-semibold text-2xl text-neutral"> {t('operations.title')}</h1>
      </div>

      <div className="overflow-y-auto flex-1">
        <Plate as="section" className="mx-auto w-[800px]">
          <h2 className="text-lg font-bold mb-4">{t('operations.subTitle')}</h2>
          {txs.length ? (
            Object.entries(groupedTxs).map(([date, txs]) => (
              <>
                <div className="text-shade-30">{date}</div>
                <Block>
                  <Table by="id" dataSource={txs}>
                    <Table.Header hidden={true}>
                      <Table.Column dataKey="dateCreated" align="left" />
                      <Table.Column dataKey="callData" align="left" />
                      <Table.Column dataKey="callData" align="left" />
                      <Table.Column dataKey="dateCreated" align="left" />
                      <Table.Column dataKey="signatories" align="right" />
                    </Table.Header>

                    <Table.Body<MultisigTransactionDS>>
                      {({ id, dateCreated, chainId, events, signatories, transaction, description }) => (
                        <Table.Row key={id} className="bg-shade-1" height="lg">
                          <Table.Cell>{new Date(dateCreated || 0).toLocaleTimeString()}</Table.Cell>
                          <Table.Cell>
                            <TransactionTitle transaction={transaction} description={description} />
                          </Table.Cell>
                          <Table.Cell>{!!transaction && <ShortTransactionInfo transaction={transaction} />}</Table.Cell>
                          <Table.Cell>
                            <Chain chainId={chainId} />
                          </Table.Cell>
                          <Table.Cell>
                            {t('operations.signing', {
                              signed: getApprovalsAmount(events),
                              signatories: signatories.length,
                            })}
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table>
                </Block>
              </>
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
