import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { type Address, type ChainId, type Transaction } from '@/shared/core';
import { CryptoType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { transactionService } from '../../lib';
import { QrTxGenerator } from '../QrCode/QrGenerator/QrTxGenerator';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  address: Address;
  transaction: Transaction;
  account: AnyAccount;
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

  const derivationPath =
    accountUtils.isVaultChainAccount(account) || accountUtils.isVaultShardAccount(account)
      ? account.derivationPath
      : undefined;

  return (
    <>
      <QrGeneratorContainer countdown={countdown} chainId={chainId} onQrReset={setupTransaction}>
        {txPayload && (
          <QrTxGenerator
            payload={txPayload}
            address={address}
            genesisHash={chainId}
            derivationPath={derivationPath}
            signingType={account.signingType}
            cryptoType={account.cryptoType || CryptoType.SR25519}
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
    </>
  );
};
