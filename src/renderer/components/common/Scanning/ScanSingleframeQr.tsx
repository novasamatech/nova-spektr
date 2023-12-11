import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { QrGeneratorContainer, QrTxGenerator } from '@renderer/components/common';
import { useI18n } from '@app/providers';
import { Transaction, useTransaction } from '@entities/transaction';
import { Button, FootnoteText } from '@shared/ui';
import { WalletCardSm } from '@entities/wallet';
import type { Account, ChainAccount, ChainId, ShardAccount, Wallet, Address } from '@shared/core';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  address: Address;
  transaction: Transaction;
  account?: Account;
  signerWallet: Wallet;
  addressPrefix: number;
  countdown: number;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (unsignedTx: UnsignedTransaction, txPayload: Uint8Array) => void;
};

const ScanSingleframeQr = ({
  api,
  chainId,
  transaction,
  address,
  account,
  signerWallet,
  addressPrefix,
  countdown,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const { createPayload } = useTransaction();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();

  useEffect(() => {
    if (txPayload) return;

    setupTransaction().catch(() => console.warn('ScanSingleframeQr | setupTransaction() failed'));
  }, [transaction, api]);

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload, unsigned } = await createPayload(transaction, api);

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
      <div className="flex items-center justify-center mb-1 h-8 w-full">
        {account && (
          <div className="flex h-full w-1/2 justify-center items-center gap-x-0.5 ">
            <FootnoteText className="text-text-secondary">{t('signing.signer')}</FootnoteText>
            <WalletCardSm wallet={signerWallet} accountId={account.accountId} addressPrefix={addressPrefix} />
          </div>
        )}
      </div>

      <QrGeneratorContainer countdown={countdown} chainId={chainId} onQrReset={setupTransaction}>
        {txPayload && (
          <QrTxGenerator
            payload={txPayload}
            signingType={signerWallet.signingType}
            address={address}
            genesisHash={chainId}
            derivationPath={(account as ChainAccount | ShardAccount).derivationPath}
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

export default ScanSingleframeQr;
