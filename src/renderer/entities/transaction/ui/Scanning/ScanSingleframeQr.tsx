import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import {
  type Account,
  type Address,
  type BaseAccount,
  type ChainAccount,
  type ChainId,
  type ShardAccount,
  type Transaction,
  type Wallet,
} from '@shared/core';
import { CryptoType } from '@shared/core';
import { Button, FootnoteText } from '@shared/ui';
import { WalletIcon } from '@entities/wallet'; // TODO: cross import
import { transactionService } from '../../lib';
import { QrTxGenerator } from '../QrCode/QrGenerator/QrTxGenerator';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  address: Address;
  transaction: Transaction;
  account?: Account;
  signerWallet: Wallet;
  countdown: number;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (txPayload: Uint8Array) => void;
};

export const ScanSingleframeQr = ({
  api,
  chainId,
  transaction,
  address,
  account,
  signerWallet,
  countdown,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();

  const [txPayload, setTxPayload] = useState<Uint8Array>();

  useEffect(() => {
    if (txPayload) return;

    setupTransaction().catch(() => console.warn('ScanSingleframeQr | setupTransaction() failed'));
  }, [transaction, api]);

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload } = await transactionService.createPayload(transaction, api);

      setTxPayload(payload);

      if (payload) {
        onResetCountdown();
      }
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      {account && (
        <div className="mb-1 flex h-8 w-full items-center justify-center">
          <div className="flex h-full items-center justify-center gap-x-0.5">
            <FootnoteText className="text-text-secondary">{t('signing.signer')}</FootnoteText>

            <div className="flex w-full items-center gap-x-2 px-2">
              <WalletIcon className="shrink-0" type={signerWallet.type} size={16} />
              <FootnoteText className="w-max text-text-secondary">{signerWallet.name}</FootnoteText>
            </div>
          </div>
        </div>
      )}

      <QrGeneratorContainer countdown={countdown} chainId={chainId} onQrReset={setupTransaction}>
        {txPayload && (
          <QrTxGenerator
            payload={txPayload}
            signingType={signerWallet.signingType}
            address={address}
            genesisHash={chainId}
            derivationPath={(account as ChainAccount | ShardAccount).derivationPath}
            cryptoType={(account as BaseAccount).cryptoType || CryptoType.SR25519}
          />
        )}
      </QrGeneratorContainer>

      <div className="mt-3 flex w-full justify-between pl-2">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>

        <Button disabled={!txPayload || countdown === 0} onClick={() => onResult(txPayload!)}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </div>
  );
};
