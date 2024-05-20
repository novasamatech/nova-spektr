import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { useI18n } from '@app/providers';
import { Button, FootnoteText } from '@shared/ui';
import { WalletIcon } from '@entities/wallet'; // TODO: cross import
import type { ChainAccount, ChainId, ShardAccount, Wallet, Address, BaseAccount, Account } from '@shared/core';
import { CryptoType, Transaction } from '@shared/core';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';
import { QrTxGenerator } from '../QrCode/QrGenerator/QrTxGenerator';
import { transactionService } from '../../lib';

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
  onResult: (unsignedTx: UnsignedTransaction, txPayload: Uint8Array) => void;
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
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();

  useEffect(() => {
    if (txPayload) return;

    setupTransaction().catch(() => console.warn('ScanSingleframeQr | setupTransaction() failed'));
  }, [transaction, api]);

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload, unsigned } = await transactionService.createPayload(transaction, api);

      setTxPayload(payload);
      setUnsignedTx(unsigned);

      if (payload) {
        onResetCountdown();
      }
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {account && (
        <div className="flex items-center justify-center mb-1 h-8 w-full">
          <div className="flex h-full justify-center items-center gap-x-0.5 ">
            <FootnoteText className="text-text-secondary">{t('signing.signer')}</FootnoteText>

            <div className="w-full flex gap-x-2 items-center px-2">
              <WalletIcon className="shrink-0" type={signerWallet.type} size={16} />
              <FootnoteText className="text-text-secondary w-max">{signerWallet.name}</FootnoteText>
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

      <div className="flex w-full justify-between mt-3 pl-2">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>

        <Button disabled={!unsignedTx || countdown === 0} onClick={() => onResult(unsignedTx!, txPayload!)}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </div>
  );
};
