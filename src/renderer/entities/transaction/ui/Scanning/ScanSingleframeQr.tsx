import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type Chain } from '@/shared/core';
import { CryptoType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { type AnyAccount, type Extrinsic } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { transactionService } from '../../lib';
import { QrTxGenerator } from '../QrCode/QrGenerator/QrTxGenerator';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';

type Props = {
  api: ApiPromise;
  chain: Chain;
  extrinsic: Extrinsic;
  account: AnyAccount;
  countdown: number;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (txPayload: Uint8Array) => void;
};

export const ScanSingleframeQr = ({
  api,
  chain,
  extrinsic,
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
  }, [extrinsic, api]);

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload } = await transactionService.createPayload(extrinsic, account.accountId, api);

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
      <QrGeneratorContainer
        countdown={countdown}
        chainId={chain.chainId}
        testId={TEST_IDS.OPERATIONS.QR_CODE_CONTAINER}
        onQrReset={setupTransaction}
      >
        {txPayload && (
          <QrTxGenerator
            payload={txPayload}
            address={toAddress(account.accountId, { prefix: chain.addressPrefix })}
            genesisHash={chain.chainId}
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
