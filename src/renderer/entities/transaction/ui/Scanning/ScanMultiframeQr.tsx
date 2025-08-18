import { u8aConcat } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type ChainId, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type TxMetadata, createTxMetadata, toAddress, upgradeNonce } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { type ExtrinsicSigningPayload } from '@/features/operations/OperationSign';
import { transactionService } from '../../lib';
import { QrTxGenerator } from '../QrCode/QrGenerator/QrTxGenerator';
import { createMultipleSignPayload, createSubstrateSignPayload } from '../QrCode/QrGenerator/common/utils';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';
import { TRANSACTION_BULK } from '../QrCode/common/constants';

type Props = {
  signingPayloads: ExtrinsicSigningPayload[];
  countdown: number;
  signerWallet: Wallet;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (txPayloads: Uint8Array[]) => void;
};

export const ScanMultiframeQr = ({
  signingPayloads,
  signerWallet,
  countdown,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();

  const [bulkTransactions, setBulkTransactions] = useState<Uint8Array>();
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);

  useEffect(() => {
    if (txPayloads.length) return;

    setupTransactions().catch(() => console.warn('ScanMultiQr | setupTransactions() failed'));
  }, []);

  const setupTransactions = async (): Promise<void> => {
    const metadataMap: Record<AccountId, Record<ChainId, TxMetadata>> = {};

    for (const signingPayload of signingPayloads) {
      const accountId = signingPayload.signatory.accountId;
      const chainId = signingPayload.chain.chainId;

      if (!metadataMap[accountId]) {
        metadataMap[accountId] = {};
      }

      if (!metadataMap[accountId][chainId]) {
        metadataMap[accountId][chainId] = await createTxMetadata(
          signingPayload.signatory.accountId,
          signingPayload.api,
        );
      }
    }

    const transactionPromises = signingPayloads.map((signingPayload) => {
      const chainId = signingPayload.chain.chainId;
      const accountId = signingPayload.signatory.accountId;

      const info = transactionService.createPayloadWithMetadata(
        signingPayload.extrinsic,
        signingPayload.api,
        metadataMap[accountId][chainId],
      );

      metadataMap[accountId][chainId] = upgradeNonce(metadataMap[accountId][chainId], 1);

      const address = walletUtils.isPolkadotVault(signerWallet)
        ? toAddress(signerWallet.rootAccountId, { prefix: 1 })
        : toAddress(signingPayload.signatory.accountId, { prefix: signingPayload.chain.addressPrefix });

      const derivationPath =
        accountUtils.isVaultShardAccount(signingPayload.signatory) ||
        accountUtils.isVaultChainAccount(signingPayload.signatory)
          ? signingPayload.signatory.derivationPath
          : undefined;

      const signPayload = createSubstrateSignPayload(
        address,
        info.payload,
        chainId,
        signingPayload.signatory.signingType,
        derivationPath,
        signingPayload.signatory.cryptoType,
      );

      return {
        info,
        signPayload,
      };
    });

    const txRequests = await Promise.all(transactionPromises);

    if (txRequests.length === 0) return;

    transactionService.logPayload(txRequests.map(({ info }) => info));

    const transactionsEncoded = u8aConcat(
      TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: txRequests.map((t) => t.signPayload) }),
    );
    const bulk = createMultipleSignPayload(transactionsEncoded);

    setBulkTransactions(bulk);
    setTxPayloads(txRequests.map((t) => t.info.payload));
  };

  useEffect(onResetCountdown, [bulkTransactions]);

  const bulkTxExist = bulkTransactions && bulkTransactions.length > 0;

  return (
    <>
      <QrGeneratorContainer
        countdown={countdown}
        chainId={signingPayloads[0].chain.chainId}
        testId={TEST_IDS.OPERATIONS.QR_CODE_CONTAINER}
        onQrReset={setupTransactions}
      >
        <QrTxGenerator payload={bulkTransactions} size="200px" />
      </QrGeneratorContainer>

      <div className="mt-3 flex w-full justify-between">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
        <Button disabled={!bulkTxExist || countdown === 0} onClick={() => onResult(txPayloads)}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </>
  );
};
