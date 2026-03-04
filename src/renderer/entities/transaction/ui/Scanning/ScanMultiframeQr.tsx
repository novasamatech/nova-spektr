import { u8aConcat } from '@polkadot/util';
import { useEffect, useRef, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type ChainId, SigningType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type TxMetadata, assert, createTxMetadata, upgradeNonce } from '@/shared/lib/utils';
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
  createSignWithProofPayload,
  createTransactionPayload,
} from '../QrCode/QrGenerator/common/utils';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';
import { TRANSACTION_BULK } from '../QrCode/common/constants';

import { getPolkadotVaultVersion } from './common/utils';

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
  const setupIdRef = useRef(0);

  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);
  const [qrPayload, setQrPayload] = useState<Uint8Array>();

  const signingType = signingPayloads[0]!.signatory.signingType;
  const isMetadataProofsSupported = signingPayloads[0]!.chain.additional?.supportsGenericLedgerApp ?? false;

  useEffect(() => {
    const currentId = ++setupIdRef.current;
    setTxPayloads([]);
    setQrPayload(undefined);

    setupTransactions(currentId).catch(() => console.warn('ScanMultiQr | setupTransactions() failed'));
  }, [tab]);

  const setupTransactions = async (setupId?: number): Promise<void> => {
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

    if (setupId !== undefined && setupId !== setupIdRef.current) return;

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
        if (signingType === SigningType.POLKADOT_VAULT) {
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
          metadataMap[signatory.accountId]![chainId]!,
        );

        metadataMap[signatory.accountId]![chainId] = upgradeNonce(metadataMap[signatory.accountId]![chainId]!, 1);

        let signPayload: Uint8Array;
        if (signingType === SigningType.POLKADOT_VAULT) {
          assert(derivationPath, 'Derivation path not found');
          signPayload = createDynamicDerivationsSignPayload(
            rootAccountId,
            info.payload,
            chainId,
            derivationPath,
            signatory.cryptoType,
          );
        } else {
          signPayload = createTransactionPayload(signatory.accountId, info.payload, chainId, signatory.cryptoType);
        }

        return {
          info,
          signPayload,
        };
      }
    });

    const txRequests = await Promise.all(transactionPromises);

    if (setupId !== undefined && setupId !== setupIdRef.current) return;
    if (txRequests.length === 0) return;

    transactionService.logPayload(txRequests.map(({ info }) => info));

    const transactionsEncoded = u8aConcat(
      TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: txRequests.map((t) => t.signPayload) }),
    );
    const bulk = createMultipleSignPayload(transactionsEncoded);

    setQrPayload(bulk);
    setTxPayloads(txRequests.map((t) => t.info.payload));
  };

  const handleQrReset = () => {
    const currentId = ++setupIdRef.current;
    setTxPayloads([]);
    setQrPayload(undefined);
    setupTransactions(currentId).catch(() => console.warn('ScanMultiQr | setupTransactions() failed'));
  };

  useEffect(onResetCountdown, [qrPayload]);

  return (
    <>
      <QrGeneratorContainer
        countdown={countdown}
        chainId={signingPayloads[0]!.chain.chainId}
        isLegacyQR={tab === 'legacy'}
        testId={TEST_IDS.OPERATIONS.QR_CODE_CONTAINER}
        onQrReset={handleQrReset}
      >
        {isMetadataProofsSupported && (
          <Tabs value={tab} onChange={setTab}>
            <Box shrink={0} fitContainer>
              <Tabs.List>
                <Tabs.Trigger value="new">
                  {t('signing.qrNewVaultTitle', { version: getPolkadotVaultVersion({ signingType, isBulkTx: true }) })}
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
