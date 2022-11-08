import { useEffect, useState } from 'react';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { ConnectionType } from '@renderer/domain/connection';
import { useI18n } from '@renderer/context/I18nContext';
import { Address, Button, Icon } from '@renderer/components/ui';
import { Explorers, QrTxGenerator } from '@renderer/components/common';
import ParitySignerSignatureReader from './ParitySignerSignatureReader/ParitySignerSignatureReader';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { TransactionType } from '@renderer/services/transaction/common/types';
import { secondsToMinutes } from './common/utils';

const enum Steps {
  SCANNING = 0,
  SIGNING = 1,
}

const DEFAULT_QR_LIFETIME = 60;

const Signing = () => {
  const { t } = useI18n();

  const { connections } = useNetworkContext();
  const { getActiveWallets } = useWallet();
  const { sortChains } = useChains();
  const { createPayload } = useTransaction();
  const activeWallets = getActiveWallets();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [countdown, setCountdown] = useState<number>(DEFAULT_QR_LIFETIME);
  const [currentStep, setCurrentStep] = useState<Steps>(Steps.SCANNING);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sortedChains = sortChains(
    Object.values(connections).filter((c) => c.connection.connectionType !== ConnectionType.DISABLED),
  );

  const currentWallet = activeWallets?.[0];
  const currentAddress = currentWallet?.mainAccounts[0].accountId || currentWallet?.chainAccounts[0].accountId;
  const currentConnection = sortedChains[0];

  const setupTransaction = async () => {
    if (!currentConnection?.api || !currentAddress) return;

    const payload = await createPayload(
      {
        address: currentAddress,
        type: TransactionType.TRANSFER,
        args: {
          dest: currentAddress,
          value: '1',
        },
      },
      currentConnection.api,
    );

    setTxPayload(payload);
  };

  useEffect(() => {
    setCountdown(DEFAULT_QR_LIFETIME);
  }, [txPayload]);

  useEffect(() => {
    setupTransaction();
  }, [currentConnection, currentAddress]);

  return (
    <>
      <div className="h-full flex flex-col">
        <h1 className="font-semibold text-2xl text-neutral mb-9">{t('signing.title')}</h1>

        <div className="w-[500px] rounded-2xl bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5 overflow-auto">
          {currentWallet && currentConnection && currentAddress && (
            <div className="bg-white shadow-surface p-5 rounded-2xl w-full">
              <div className="flex items-center justify-between h-15">
                <div className="flex gap-2.5">
                  <Icon name="paritySigner" size={32} />
                  <div>
                    <div className="font-bold text-lg text-neutral">{currentWallet.name}</div>
                    <Address type="adaptive" address={currentAddress} addressStyle="small" />
                  </div>
                </div>
                <Explorers chain={currentConnection} address={currentAddress} />
              </div>
            </div>
          )}

          {currentStep === Steps.SCANNING && (
            <div className="flex flex-col gap-2.5 w-full">
              <div className="bg-white p-5 shadow-surface rounded-2xl flex flex-col items-center gap-5 w-full">
                <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>

                {txPayload && currentAddress ? (
                  <div className="w-[220px] h-[220px]">
                    <QrTxGenerator
                      cmd={0}
                      payload={txPayload}
                      address={currentAddress}
                      genesisHash={currentConnection.chainId}
                    />
                  </div>
                ) : (
                  <div className="bg-shade-20 w-[220px] h-[220px]"></div>
                )}

                <div className="flex items-center uppercase font-normal text-xs gap-1.25">
                  {t('signing.qrCountdownTitle')}
                  <div className="rounded-md bg-success text-white py-0.5 px-1.5">{secondsToMinutes(countdown)}</div>
                </div>
              </div>

              <div className="flex flex-col items-center text-xs font-semibold text-primary">
                <a
                  className="flex items-center"
                  href={'https://github.com/nova-wallet/nova-utils/wiki/Parity-Signer-troubleshooting'}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon as="img" name="globe" /> {t('signing.troubleshootingLink')}
                </a>
                <a
                  className="flex items-center"
                  href={'https://nova-wallet.github.io/metadata-portal/'}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon as="img" name="globe" /> {t('signing.metadataPortalLink')}
                </a>
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
                <ParitySignerSignatureReader
                  className="w-full rounded-2lg"
                  countdown={countdown}
                  size={460}
                  onResult={(signature) => {
                    console.log(signature);
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
                    setupTransaction();
                  }}
                >
                  {t('signing.generateNewQrButton')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Signing;
