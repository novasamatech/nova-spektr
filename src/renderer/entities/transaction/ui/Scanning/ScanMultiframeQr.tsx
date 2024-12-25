import { type ApiPromise } from '@polkadot/api';
import { u8aConcat } from '@polkadot/util';
import init, { Encoder } from 'raptorq';
import { useEffect, useState } from 'react';

import { type Address, type ChainId, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type TxMetadata, createTxMetadata, toAddress, upgradeNonce } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { type SigningPayload } from '@/features/operations/OperationSign';
import { transactionService } from '../../lib';
import { QrMultiframeGenerator } from '../QrCode/QrGenerator/QrMultiframeTxGenerator';
import { createMultipleSignPayload, createSubstrateSignPayload } from '../QrCode/QrGenerator/common/utils';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';
import { TRANSACTION_BULK } from '../QrCode/common/constants';

type Props = {
  apis: Record<ChainId, ApiPromise>;
  signingPayloads: SigningPayload[];
  countdown: number;
  signerWallet: Wallet;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (txPayloads: Uint8Array[]) => void;
};

export const ScanMultiframeQr = ({
  apis,
  signingPayloads,
  signerWallet,
  countdown,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();

  const [encoder, setEncoder] = useState<Encoder>();
  const [bulkTransactions, setBulkTransactions] = useState<Uint8Array>();
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);

  useEffect(() => {
    if (txPayloads.length) return;

    setupTransactions().catch(() => console.warn('ScanMultiQr | setupTransactions() failed'));
  }, []);

  const setupTransactions = async (): Promise<void> => {
    const metadataMap: Record<Address, Record<ChainId, TxMetadata>> = {};

    for (const signingPayload of signingPayloads) {
      const address = toAddress(signingPayload.account.accountId, { prefix: signingPayload.chain.addressPrefix });

      if (!metadataMap[address]) {
        metadataMap[address] = {};
      }

      if (!metadataMap[address][signingPayload.chain.chainId]) {
        metadataMap[address][signingPayload.chain.chainId] = await createTxMetadata(
          address,
          apis[signingPayload.chain.chainId],
        );
      }
    }

    const transactionPromises = signingPayloads.map((signingPayload) => {
      const chainId = signingPayload.chain.chainId;
      const api = apis[chainId];
      const txAddress = toAddress(signingPayload.account.accountId, { prefix: signingPayload.chain.addressPrefix });

      const info = transactionService.createPayloadWithMetadata(
        signingPayload.transaction,
        api,
        metadataMap[txAddress][chainId],
      );

      metadataMap[txAddress][chainId] = upgradeNonce(metadataMap[txAddress][chainId], 1);

      let address = '';

      const root = accountUtils.getBaseAccount(signerWallet.accounts, signerWallet.id);

      if (walletUtils.isPolkadotVault(signerWallet) && root) {
        address = toAddress(root.accountId, { prefix: 1 });
      } else {
        address = toAddress(signingPayload.account.accountId, { prefix: signingPayload.chain.addressPrefix });
      }

      const derivationPath =
        accountUtils.isVaultShardAccount(signingPayload.account) ||
        accountUtils.isVaultChainAccount(signingPayload.account)
          ? signingPayload.account.derivationPath
          : undefined;

      const signPayload = createSubstrateSignPayload(
        address,
        info.payload,
        chainId,
        signingPayload.account.signingType,
        derivationPath,
        signingPayload.account.cryptoType,
      );

      return {
        info,
        signPayload,
        transactionData: signingPayload.transaction,
      };
    });

    const txRequests = await Promise.all(transactionPromises);

    if (txRequests.length === 0) return;

    transactionService.logPayload(txRequests.map(({ info }) => info));

    await init();

    const transactionsEncoded = u8aConcat(
      TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: txRequests.map((t) => t.signPayload) }),
    );
    const bulk = createMultipleSignPayload(transactionsEncoded);

    setBulkTransactions(bulk);
    setTxPayloads(txRequests.map((t) => t.info.payload));
    setEncoder(Encoder.with_defaults(bulk, 128));
  };

  useEffect(onResetCountdown, [bulkTransactions]);

  const bulkTxExist = bulkTransactions && bulkTransactions.length > 0;

  return (
    <>
      <QrGeneratorContainer
        countdown={countdown}
        chainId={signingPayloads[0].chain.chainId}
        onQrReset={setupTransactions}
      >
        {bulkTxExist && encoder && <QrMultiframeGenerator payload={bulkTransactions} size={200} encoder={encoder} />}
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
