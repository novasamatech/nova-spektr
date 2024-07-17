import { ApiPromise } from '@polkadot/api';
import { u8aConcat } from '@polkadot/util';
import init, { Encoder } from 'raptorq';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { transactionService } from '@entities/transaction';
import { TxMetadata, createTxMetadata, toAddress, upgradeNonce } from '@shared/lib/utils';
import { Button, FootnoteText } from '@shared/ui';
import type { ShardAccount, BaseAccount, ChainId, Address } from '@shared/core';
import { Wallet } from '@shared/core';
import { createSubstrateSignPayload, createMultipleSignPayload } from '../QrCode/QrGenerator/common/utils';
import { TRANSACTION_BULK } from '../QrCode/common/constants';
import { QrMultiframeGenerator } from '../QrCode/QrGenerator/QrMultiframeTxGenerator';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';
import { WalletIcon, accountUtils, walletUtils } from '../../../wallet';
import { SigningPayload } from '@features/operations/OperationSign';

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

      const { payload } = transactionService.createPayloadWithMetadata(
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

      const signPayload = createSubstrateSignPayload(
        address,
        payload,
        chainId,
        signerWallet.signingType,
        (signingPayload.account as ShardAccount).derivationPath,
        (signingPayload.account as BaseAccount).cryptoType,
      );

      return {
        signPayload,
        payload,
        transactionData: signingPayload.transaction,
      };
    });

    const txRequests = await Promise.all(transactionPromises);

    if (txRequests.length === 0) return;

    await init();

    const transactionsEncoded = u8aConcat(
      TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: txRequests.map((t) => t.signPayload) }),
    );
    const bulk = createMultipleSignPayload(transactionsEncoded);

    setBulkTransactions(bulk);
    setTxPayloads(txRequests.map((t) => t.payload));
    setEncoder(Encoder.with_defaults(bulk, 128));
  };

  useEffect(onResetCountdown, [bulkTransactions]);

  const bulkTxExist = bulkTransactions && bulkTransactions.length > 0;

  return (
    <div className="flex flex-col items-center w-full">
      {signingPayloads.length > 0 && (
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

      <QrGeneratorContainer
        countdown={countdown}
        chainId={signingPayloads[0].chain.chainId}
        onQrReset={setupTransactions}
      >
        {bulkTxExist && encoder && <QrMultiframeGenerator payload={bulkTransactions} size={200} encoder={encoder} />}
      </QrGeneratorContainer>

      <div className="flex w-full justify-between mt-3">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
        <Button disabled={!bulkTxExist || countdown === 0} onClick={() => onResult(txPayloads)}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </div>
  );
};
