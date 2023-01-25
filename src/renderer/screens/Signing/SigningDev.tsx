import { useEffect, useState } from 'react';
import { u8aConcat } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import init, { Encoder } from 'raptorq';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { ConnectionType } from '@renderer/domain/connection';
import { useI18n } from '@renderer/context/I18nContext';
import { Button, Icon } from '@renderer/components/ui';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { TransactionType } from '@renderer/domain/transaction';
import { secondsToMinutes } from './common/utils';
import { getMetadataPortalUrl, TROUBLESHOOTING_URL } from './common/consts';
import { useAccount } from '@renderer/services/account/accountService';
import {
  createMultipleSignPayload,
  createSignPayload,
} from '@renderer/components/common/QrCode/QrGenerator/common/utils';
import { TRANSACTION_BULK } from '@renderer/components/common/QrCode/QrReader/common/constants';
import { Command } from '@renderer/components/common/QrCode/QrGenerator/common/constants';
import QrMultiframeGenerator from '@renderer/components/common/QrCode/QrGenerator/QrMultiframeTxGenerator';
import MultiframeSignatureReader from './MultiframeSignatureReader/MultiframeSignatureReader';
import { HexString, SigningType } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/services/balance/common/utils';
import Progress from './Progress';

const enum Steps {
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
  const [currentStep, setCurrentStep] = useState<Steps>(Steps.SCANNING);

  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
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
      const sourceAddress = toAddress(account.publicKey || '0x', currentConnection.addressPrefix);
      const destAddress = toAddress(
        activeAccounts[activeAccounts.length - 1 - index].publicKey || '0x',
        currentConnection.addressPrefix,
      );

      const transactionData = {
        address: sourceAddress,
        type: TransactionType.TRANSFER,
        chainId: currentConnection.chainId,
        args: {
          dest: destAddress,
          value: '100',
        },
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

  const validateTransaction = (transaction: any) => {
    return true;
  };

  const sign = async (signatures: HexString[]) => {
    const api = currentConnection?.api;
    if (!api || !rawTransactions.some(validateTransaction)) return;

    setCurrentStep(Steps.EXECUTING);

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
    <div className="h-full flex flex-col">
      <h1 className="font-semibold text-2xl text-neutral mb-9">{t('signing.title')}</h1>

      <div className="w-[550px] rounded-2xl bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5 overflow-auto">
        {currentStep === Steps.SCANNING && (
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

            <div className="flex flex-col items-center text-xs font-semibold text-primary">
              <a className="flex items-center" href={TROUBLESHOOTING_URL} rel="noopener noreferrer" target="_blank">
                <Icon as="img" name="globe" /> {t('signing.troubleshootingLink')}
              </a>
              {currentConnection && (
                <a
                  className="flex items-center"
                  href={getMetadataPortalUrl(currentConnection.chainId)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon as="img" name="globe" /> {t('signing.metadataPortalLink')}
                </a>
              )}
            </div>

            <Button
              className="w-fit m-auto"
              variant="fill"
              pallet="primary"
              weight="lg"
              onClick={() => setCurrentStep(Steps.SIGNING)}
            >
              {t('signing.continueButton')}
            </Button>
          </div>
        )}

        {currentStep === Steps.SIGNING && (
          <div className="bg-white shadow-surface rounded-2xl flex flex-col items-center gap-5 w-full">
            <div className="my-4 text-neutral-variant text-base font-semibold">{t('signing.scanSignatureTitle')}</div>

            <div className="h-[460px]">
              <MultiframeSignatureReader
                className="w-full rounded-2lg"
                countdown={countdown}
                size={460}
                onResult={(signatures) => {
                  sign(signatures);
                }}
              />
            </div>
            {countdown === 0 && (
              <Button
                variant="fill"
                pallet="primary"
                weight="lg"
                onClick={() => {
                  setCurrentStep(Steps.SCANNING);
                }}
              >
                {t('signing.generateNewQrButton')}
              </Button>
            )}
          </div>
        )}

        {currentStep === Steps.EXECUTING && (
          <Progress progress={progress + failedTxs.length} max={unsignedTransactions.length} />
        )}
      </div>
    </div>
  );
};

export default Signing;
