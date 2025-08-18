import { u8aConcat } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import { useEffect, useRef, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type ChainId, SigningType, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type TxMetadata, createTxMetadata, upgradeNonce } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { Box, Tabs } from '@/shared/ui-kit';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { type ExtrinsicSigningPayload } from '@/features/operations/OperationSign';
import { transactionService } from '../../lib';
import { QrTxGenerator } from '../QrCode/QrGenerator/QrTxGenerator';
import {
  createMultipleSignPayload,
  createSubstrateSignPayload,
  createSubstrateSignWithProofPayload,
} from '../QrCode/QrGenerator/common/utils';
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

    const transactionPromises = signingPayloads.map(async (signingPayload, nonceIncrement) => {
      const signatory = signingPayload.signatory;
      const address = walletUtils.isPolkadotVault(signerWallet)
        ? encodeAddress(signerWallet.rootAccountId)
        : encodeAddress(signatory.accountId, signingPayload.chain.addressPrefix);

      const derivationPath =
        accountUtils.isVaultShardAccount(signatory) || accountUtils.isVaultChainAccount(signatory)
          ? signatory.derivationPath
          : undefined;

      if (tab === 'new' && isMetadataProofsSupported) {
        const info = await transactionService.createPayloadWithProof(
          signingPayload.extrinsic,
          signatory.accountId,
          signingPayload.api,
          nonceIncrement,
        );
        const signPayload = createSubstrateSignWithProofPayload(
          encodeAddress(signatory.accountId, signingPayload.chain.addressPrefix),
          info.metadataProof,
          info.payload,
          signingPayload.chain.chainId,
          signatory.signingType,
          derivationPath,
          signatory.cryptoType,
        );

        return {
          info,
          signPayload,
        };
      } else {
        const chainId = signingPayload.chain.chainId;
        const accountId = signatory.accountId;

        const info = transactionService.createPayloadWithMetadata(
          signingPayload.extrinsic,
          signingPayload.api,
          metadataMap[accountId][chainId],
        );

        metadataMap[accountId][chainId] = upgradeNonce(metadataMap[accountId][chainId], 1);

        const signPayload = createSubstrateSignPayload(
          address,
          info.payload,
          chainId,
          signatory.signingType,
          derivationPath,
          signatory.cryptoType,
        );

        return {
          info,
          signPayload,
        };
      }
    });

    const txRequests = await Promise.all(transactionPromises);

    if (txRequests.length === 0) return;

    transactionService.logPayload(txRequests.map(({ info }) => info));

    const transactionsEncoded = u8aConcat(
      TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: txRequests.map((t) => t.signPayload) }),
    );
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
