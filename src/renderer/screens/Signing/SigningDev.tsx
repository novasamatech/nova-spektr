import { useEffect, useState } from 'react';
import { u8aConcat } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import init, { Encoder } from 'raptorq';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { ConnectionType } from '@renderer/domain/connection';
import { useI18n } from '@renderer/context/I18nContext';
import { Button, Plate, InfoLink } from '@renderer/components/ui';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { getMetadataPortalUrl, TROUBLESHOOTING_URL } from './common/consts';
import { useAccount } from '@renderer/services/account/accountService';
import {
  createMultipleSignPayload,
  createSignPayload,
} from '@renderer/components/common/QrCode/QrGenerator/common/utils';
import { TRANSACTION_BULK } from '@renderer/components/common/QrCode/QrReader/common/constants';
import { Command } from '@renderer/components/common/QrCode/QrGenerator/common/constants';
import QrMultiframeGenerator from '@renderer/components/common/QrCode/QrGenerator/QrMultiframeTxGenerator';
import { HexString, SigningType } from '@renderer/domain/shared-kernel';
import Progress from './Progress';
import { secondsToMinutes } from '@renderer/shared/utils/time';
import { toAddress } from '@renderer/shared/utils/address';
import QrSignatureReader from '@renderer/screens/Signing/QrReaderWrapper/QrReaderWrapper';

const enum Step {
  SCANNING = 0,
  SIGNING = 1,
  EXECUTING = 2,
}

const DEFAULT_QR_LIFETIME = 300;

const Signing = () => {
  const { t } = useI18n();

  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { sortChains } = useChains();
  const { createPayload, submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const [encoder, setEncoder] = useState<Encoder>();

  const [progress, setProgress] = useState<number>(0);
  const [failedTxs, setFailedTxs] = useState<number[]>([]);

  const allActiveAccounts = getActiveAccounts();
  const activeAccounts = allActiveAccounts.filter((a) => a.signingType === SigningType.PARITY_SIGNER);

  const [countdown, setCountdown] = useState<number>(DEFAULT_QR_LIFETIME);
  const [currentStep, setCurrentStep] = useState<Step>(Step.SCANNING);

  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [bulkTransactions, setBulkTransactions] = useState<Uint8Array>();
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  const sortedChains = sortChains(
    Object.values(connections).filter((c) => c.connection.connectionType !== ConnectionType.DISABLED),
  );

  const currentConnection = sortedChains.find(
    (c) => c.chainId === '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
  );

  const setupTransactions = async () => {
    const api = currentConnection?.api;
    if (!api) return;

    const transactionPromises = activeAccounts.map(async (account, index) => {
      const sourceAddress = toAddress(account.accountId || '0x', { prefix: currentConnection.addressPrefix });
      const destAddress = toAddress(activeAccounts[activeAccounts.length - 1 - index].accountId || '0x', {
        prefix: currentConnection.addressPrefix,
      });

      const transactionData = {
        address: sourceAddress,
        type: TransactionType.TRANSFER,
        chainId: currentConnection.chainId,
        args: { dest: destAddress, value: '100' },
      };

      const { payload, unsigned } = await createPayload(transactionData, api);

      return {
        signPayload: createSignPayload(sourceAddress, Command.Transaction, payload, currentConnection.chainId),
        unsigned,
        transactionData,
      };
    });
    const transactions = await Promise.all(transactionPromises);

    if (!transactions.length) return;

    let transactionsEncoded = u8aConcat(
      TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: transactions.map((t) => t.signPayload) }),
    );
    let bulk = createMultipleSignPayload(transactionsEncoded);
    setBulkTransactions(bulk);
    setUnsignedTransactions(transactions.map((t) => t.unsigned));
    setRawTransactions(transactions.map((t) => t.transactionData));

    await init();
    setEncoder(Encoder.with_defaults(bulk, 128));
  };

  useEffect(() => {
    setCountdown(DEFAULT_QR_LIFETIME);
  }, [bulkTransactions]);

  useEffect(() => {
    setupTransactions();
  }, [currentConnection, activeAccounts.length]);

  const validateTransaction = () => {
    return true;
  };

  const sign = async (signatures: HexString[]) => {
    const api = currentConnection?.api;
    if (!api || !rawTransactions.some(validateTransaction)) return;

    setCurrentStep(Step.EXECUTING);

    unsignedTransactions.forEach(async (unsigned, index) => {
      const extrinsic = await getSignedExtrinsic(unsigned, signatures[index], api);

      submitAndWatchExtrinsic(extrinsic, unsigned, api, (executed) => {
        if (executed) {
          setProgress((p) => p + 1);
        } else {
          setFailedTxs((f) => [...f, index]);
        }

        if (progress + failedTxs.length === unsignedTransactions.length) {
          console.info('Submiting finished');

          if (failedTxs.length) console.info('There are failed transactions: ', failedTxs.join(', '));
        }
      });
    });
  };

  return (
    <div className="h-full flex flex-col gap-y-9">
      <h1 className="font-semibold text-2xl text-neutral px-5">{t('signing.title')}</h1>

      <div className="overflow-y-auto flex-1">
        <Plate as="section" className="w-[550px] flex flex-col items-center m-auto gap-2.5">
          {currentStep === Step.SCANNING && (
            <div className="flex flex-col gap-2.5 w-full">
              <div className="bg-white p-5 shadow-surface rounded-2xl flex flex-col items-center gap-5 w-full">
                <div className="text-neutral-variant text-base font-semibold">
                  {t('Send some WND between selected accounts')}
                </div>

                {bulkTransactions?.length && encoder ? (
                  <>
                    <div className="w-[220px] h-[220px]">
                      <QrMultiframeGenerator payload={bulkTransactions} size={200} encoder={encoder} />
                    </div>

                    {countdown > 0 && (
                      <div className="flex items-center uppercase font-normal text-xs gap-1.25">
                        {t('signing.qrCountdownTitle')}
                        <div className="rounded-md bg-success text-white py-0.5 px-1.5">
                          {secondsToMinutes(countdown)}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-[220px] h-[220px] rounded-2lg bg-shade-20 animate-pulse" />
                )}
              </div>

              <div className="flex flex-col gap-y-1 items-center text-xs font-semibold text-primary">
                <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>
                {currentConnection && (
                  <InfoLink url={getMetadataPortalUrl(currentConnection.chainId)}>
                    {t('signing.metadataPortalLink')}
                  </InfoLink>
                )}
              </div>

              <Button
                className="w-fit m-auto"
                variant="fill"
                pallet="primary"
                weight="lg"
                onClick={() => setCurrentStep(Step.SIGNING)}
              >
                {t('signing.continueButton')}
              </Button>
            </div>
          )}

          {currentStep === Step.SIGNING && (
            <div className="bg-white shadow-surface rounded-2xl flex flex-col items-center gap-5 w-full">
              <div className="my-4 text-neutral-variant text-base font-semibold">{t('signing.scanSignatureTitle')}</div>

              <div className="h-[460px]">
                <QrSignatureReader
                  className="w-full rounded-2lg"
                  countdown={countdown}
                  size={460}
                  onResult={(res) => sign(res as HexString[])}
                />
              </div>
              {countdown === 0 && (
                <Button
                  variant="fill"
                  pallet="primary"
                  weight="lg"
                  onClick={() => {
                    setCurrentStep(Step.SCANNING);
                  }}
                >
                  {t('signing.generateNewQrButton')}
                </Button>
              )}
            </div>
          )}

          {currentStep === Step.EXECUTING && (
            <Progress progress={progress + failedTxs.length} max={unsignedTransactions.length} />
          )}
        </Plate>
      </div>
    </div>
  );
};

export default Signing;
