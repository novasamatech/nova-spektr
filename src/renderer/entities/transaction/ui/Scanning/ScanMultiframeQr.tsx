import { u8aConcat } from '@polkadot/util';
import { useEffect, useRef, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type ChainId, SigningType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type TxMetadata, assert, createTxMetadata, upgradeNonce } from '@/shared/lib/utils';
import { isElectron } from '@/shared/lib/utils/browser';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { Box, Tabs } from '@/shared/ui-kit';
import { accountUtils } from '@/entities/wallet';
import { type ExtrinsicSigningPayload } from '@/features/operations/OperationSign';
import { transactionService } from '../../lib';
import { QrTxGenerator } from '../QrCode/QrGenerator/QrTxGenerator';
import {
  createDynamicDerivationsSignPayload,
  createDynamicDerivationsSignWithProofPayload,
  createMultipleSignPayload,
  createSignPayload,
  createSignWithProofPayload,
} from '../QrCode/QrGenerator/common/utils';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';
import { TRANSACTION_BULK } from '../QrCode/common/constants';

type Props = {
  signingPayloads: ExtrinsicSigningPayload[];
  countdown: number;
  rootAccountId: AccountId;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (txPayloads: Uint8Array[]) => void;
};

export const ScanMultiframeQr = ({
  signingPayloads,
  rootAccountId,
  countdown,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const [tab, setTab] = useState('new');
  const prevTab = useRef<string>(null);

  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);
  const [qrPayload, setQrPayload] = useState<Uint8Array>();

  const isPV = signingPayloads[0].signatory.signingType === SigningType.POLKADOT_VAULT;
  const isMetadataProofsSupported = signingPayloads[0].chain.additional?.supportsGenericLedgerApp ?? false;

  useEffect(() => {
    if (txPayloads.length && qrPayload && tab === prevTab.current) return;
    prevTab.current = tab;

    setupTransactions().catch(() => console.warn('ScanMultiQr | setupTransactions() failed'));
  }, [txPayloads, qrPayload, tab]);

  const setupTransactions = async (): Promise<void> => {
    const metadataMap: Record<AccountId, Record<ChainId, TxMetadata>> = {};

    // LOG: Metadata fetching for era debugging
    console.group(`[ERA-DEBUG] setupTransactions - Metadata Fetching (${isElectron() ? 'ELECTRON' : 'WEB'})`);
    console.log('Total signingPayloads:', signingPayloads.length);
    console.log('Tab:', tab);
    console.log('isMetadataProofsSupported:', isMetadataProofsSupported);

    for (const signingPayload of signingPayloads) {
      const accountId = signingPayload.signatory.accountId;
      const chainId = signingPayload.chain.chainId;

      if (!metadataMap[accountId]) {
        metadataMap[accountId] = {};
      }

      if (!metadataMap[accountId][chainId]) {
        const metadata = await createTxMetadata(signingPayload.signatory.accountId, signingPayload.api);
        console.log(`Metadata for ${accountId} on ${chainId}:`, {
          blockNumber: metadata.signerPayloadBase.blockNumber,
          blockHash: metadata.signerPayloadBase.blockHash,
          mortalLength: metadata.mortalLength,
        });
        metadataMap[accountId][chainId] = metadata;
      }
    }
    console.groupEnd();

    const transactionPromises = signingPayloads.map(async (signingPayload, nonceIncrement) => {
      const signatory = signingPayload.signatory;
      const derivationPath =
        accountUtils.isVaultChainAccount(signatory) || accountUtils.isVaultShardAccount(signatory)
          ? signatory.derivationPath
          : null;

      if (tab === 'new' && isMetadataProofsSupported) {
        const info = await transactionService.createPayloadWithProof(
          signingPayload.extrinsic,
          signatory.accountId,
          signingPayload.api,
          nonceIncrement,
        );

        let signPayload: Uint8Array;
        if (isPV) {
          assert(derivationPath, 'Derivation path not found');
          signPayload = createDynamicDerivationsSignWithProofPayload(
            rootAccountId,
            info.metadataProof,
            info.payload,
            signingPayload.chain.chainId,
            derivationPath,
            signatory.cryptoType,
          );
        } else {
          signPayload = createSignWithProofPayload(
            signatory.accountId,
            info.metadataProof,
            info.payload,
            signingPayload.chain.chainId,
            signatory.cryptoType,
          );
        }

        return {
          info,
          signPayload,
        };
      } else {
        const chainId = signingPayload.chain.chainId;

        const info = transactionService.createPayloadWithMetadata(
          signingPayload.extrinsic,
          signingPayload.api,
          metadataMap[signatory.accountId][chainId],
        );

        metadataMap[signatory.accountId][chainId] = upgradeNonce(metadataMap[signatory.accountId][chainId], 1);

        let signPayload: Uint8Array;
        if (isPV) {
          assert(derivationPath, 'Derivation path not found');
          signPayload = createDynamicDerivationsSignPayload(
            rootAccountId,
            info.payload,
            chainId,
            derivationPath,
            signatory.cryptoType,
          );
        } else {
          signPayload = createSignPayload(signatory.accountId, info.payload, chainId, signatory.cryptoType);
        }

        return {
          info,
          signPayload,
        };
      }
    });

    const txRequests = await Promise.all(transactionPromises);

    if (txRequests.length === 0) return;

    // LOG: Pre-encoding validation for era debugging
    console.group('[ERA-DEBUG] setupTransactions - Pre-Encoding Validation');
    console.log('Number of transactions:', txRequests.length);
    // eslint-disable-next-line no-restricted-syntax
    txRequests.forEach((tx, idx) => {
      console.log(`Transaction ${idx}:`, {
        signPayloadLength: tx.signPayload.length,
        signPayloadFirstBytes: Array.from(tx.signPayload.slice(0, 10)),
        signPayloadLastBytes: Array.from(tx.signPayload.slice(-10)),
      });
    });
    console.groupEnd();

    transactionService.logPayload(txRequests.map(({ info }) => info));

    const transactionsEncoded = u8aConcat(
      TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: txRequests.map((t) => t.signPayload) }),
    );

    // LOG: Post-encoding validation
    console.group('[ERA-DEBUG] setupTransactions - Post-Encoding');
    console.log('transactionsEncoded length:', transactionsEncoded.length);
    console.log('transactionsEncoded first 20 bytes:', Array.from(transactionsEncoded.slice(0, 20)));
    console.groupEnd();
    const bulk = createMultipleSignPayload(transactionsEncoded);

    setQrPayload(bulk);
    setTxPayloads(txRequests.map((t) => t.info.payload));
  };

  useEffect(onResetCountdown, [qrPayload]);

  return (
    <>
      <QrGeneratorContainer
        countdown={countdown}
        chainId={signingPayloads[0].chain.chainId}
        isLegacyQR={tab === 'legacy'}
        testId={TEST_IDS.OPERATIONS.QR_CODE_CONTAINER}
        onQrReset={setupTransactions}
      >
        {isMetadataProofsSupported && (
          <Tabs value={tab} onChange={setTab}>
            <Box shrink={0} fitContainer>
              <Tabs.List>
                <Tabs.Trigger value="new">
                  {t('signing.qrNewVaultTitle', { version: isPV ? '7.1' : '7.0' })}
                </Tabs.Trigger>
                <Tabs.Trigger value="legacy">{t('signing.qrLegacyVaultTitle')}</Tabs.Trigger>
              </Tabs.List>
            </Box>
          </Tabs>
        )}
        <QrTxGenerator payload={qrPayload} size="200px" />
      </QrGeneratorContainer>

      <div className="mt-3 flex w-full justify-between">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
        <Button disabled={!qrPayload || countdown === 0} onClick={() => onResult(txPayloads)}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </>
  );
};
