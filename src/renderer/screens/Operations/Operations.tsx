import { groupBy } from 'lodash';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { IndexableType } from 'dexie';
import { hexToU8a, isHex } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';

import { BaseModal, Block, Button, InputArea, InputHint, Plate, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { MiltisigTransactionFinalStatus, MultisigEvent, MultisigTransactionStatus } from '@renderer/domain/transaction';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';
import Chain from './components/Chain';
import ShortTransactionInfo from './components/ShortTransactionInfo';
import TransactionTitle from './components/TransactionTitle';
import EmptyOperations from './components/EmptyState/EmptyOperations';
import { useToggle } from '@renderer/shared/hooks';
import { CallData, ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useAccount } from '@renderer/services/account/accountService';
import { nonNullable } from '@renderer/shared/utils/functions';
import { MultisigAccount } from '@renderer/domain/account';

const sortByDate = ([dateA]: [string, MultisigTransactionDS[]], [dateB]: [string, MultisigTransactionDS[]]) =>
  new Date(dateA) < new Date(dateB) ? 1 : -1;

const StatusTitle: Record<MultisigTransactionStatus, string> = {
  SIGNING: 'operations.status.signing',
  [MiltisigTransactionFinalStatus.CANCELLED]: 'operations.status.cancelled',
  [MiltisigTransactionFinalStatus.ERROR]: 'operations.status.error',
  [MiltisigTransactionFinalStatus.ESTABLISHED]: 'operations.status.esteblished',
  [MiltisigTransactionFinalStatus.SUCCESS]: 'operations.status.success',
};

const Operations = () => {
  const { t, dateLocale } = useI18n();

  const [isCallDataModalOpen, toggleCallDataModal] = useToggle(false);
  const [currentTx, setCurrentTx] = useState<MultisigTransactionDS>();
  const [callData, setCallData] = useState<string>();
  const [isValidCallData, setIsValidCallData] = useState<boolean>(false);

  const { getLiveAccountMultisigTxs, updateCallData } = useMultisigTx();
  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();

  const accounts = getActiveAccounts({ signingType: SigningType.MULTISIG });
  const thresholds = new Map(accounts.map((account) => [account.publicKey, (account as MultisigAccount).threshold]));
  const publicKeys = accounts.map((a) => a.publicKey).filter(nonNullable);

  const txs = getLiveAccountMultisigTxs(publicKeys);
  const getApprovalsAmount = (events: MultisigEvent[]) => {
    return events.filter((e) => e.status === 'SIGNED').length;
  };

  const groupedTxs = groupBy(
    txs.filter((tx) => accounts.find((a) => a.publicKey === tx.publicKey)),
    ({ dateCreated }) => format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  const showCallDataModal = (id: IndexableType | undefined) => {
    setCurrentTx(txs.find((t) => t.id === id));
    setCallData('');
    toggleCallDataModal();
  };

  const initCallData = async () => {
    const connection = connections[currentTx?.chainId as ChainId];

    const api = connection.api;

    if (!api || !currentTx || !isValidCallData) return;

    updateCallData(api, currentTx, callData as CallData);

    toggleCallDataModal();
  };

  useEffect(() => {
    setIsValidCallData(isHex(callData) && currentTx?.callHash === blake2AsHex(hexToU8a(callData)));
  }, [callData]);

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
                <>
                  <div className="text-shade-30">{date}</div>
                  <Block>
                    <Table by="id" dataSource={txs.sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))}>
                      <Table.Header hidden={true}>
                        <Table.Column width={100} dataKey="dateCreated" align="left" />
                        <Table.Column dataKey="callData" align="left" />
                        <Table.Column dataKey="transaction" align="right" />
                        <Table.Column width={100} dataKey="chainId" align="left" />
                        <Table.Column width={150} dataKey="signatories" align="right" />
                      </Table.Header>

                      <Table.Body<MultisigTransactionDS>>
                        {({ id, dateCreated, chainId, events, transaction, description, publicKey, status }) => (
                          <Table.Row key={id} className="bg-shade-1" height="lg">
                            <Table.Cell>{format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}</Table.Cell>
                            <Table.Cell>
                              <TransactionTitle transaction={transaction} description={description} />
                            </Table.Cell>
                            <Table.Cell>
                              {transaction ? (
                                <ShortTransactionInfo transaction={transaction} />
                              ) : (
                                <Button pallet="primary" variant="text" onClick={() => showCallDataModal(id)}>
                                  {t('operations.addCallDataButton')}
                                </Button>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              <Chain chainId={chainId} />
                            </Table.Cell>
                            <Table.Cell>
                              {status === 'SIGNING'
                                ? t('operations.signing', {
                                    signed: getApprovalsAmount(events),
                                    threshold: thresholds.get(publicKey),
                                  })
                                : t(StatusTitle[status])}
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table>
                  </Block>

                  <BaseModal
                    isOpen={isCallDataModalOpen}
                    title={t('operations.callData.title')}
                    closeButton
                    contentClass="px-5 pb-4 w-[400px]"
                    onClose={toggleCallDataModal}
                  >
                    <InputArea
                      wrapperClass="my-2"
                      placeholder={t('operations.callData.inputPlaceholder')}
                      value={callData}
                      invalid={!isValidCallData}
                      onChange={setCallData}
                    />
                    <InputHint className="mb-4" active={!isValidCallData} variant="error">
                      {t('operations.callData.errorMessage')}
                    </InputHint>

                    <InputHint className="mb-4" active={isValidCallData} variant="hint">
                      {t('operations.callData.inputHint')}
                    </InputHint>

                    <Button
                      className="w-full"
                      pallet="primary"
                      variant="fill"
                      disabled={!isValidCallData}
                      onClick={initCallData}
                    >
                      {t('operations.callData.continueButton')}
                    </Button>
                  </BaseModal>
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
