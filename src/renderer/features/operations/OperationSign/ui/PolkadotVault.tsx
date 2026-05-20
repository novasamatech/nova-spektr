import { useEffect, useState } from 'react';

import { type HexString, type PolkadotVaultWallet, type SingleShardWallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useCountdown } from '@/shared/lib/hooks';
import { ValidationErrors, getCurrentBlockNumber, isEraExpired, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Loader } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import {
  CameraAccessAlert,
  QrReaderWrapper,
  ScanMultiframeQr,
  ScanSingleframeQr,
  transactionService,
  useCameraAvailability,
} from '@/entities/transaction';
import { operationSignUtils } from '../lib/operation-sign-utils';
import { type SigningProps } from '../lib/types';

export const PolkadotVault = ({ signingPayloads, signerWallet, validateBalance, onGoBack, onResult }: SigningProps) => {
  const { t } = useI18n();
  const { status: cameraStatus, retry: retryCamera } = useCameraAvailability();

  const [countdown, resetCountdown] = useCountdown();
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);
  const [eraInfo, setEraInfo] = useState<{ blockNumber: number; mortalLength: number } | null>(null);
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const isScanStep = !txPayloads.length;
  const isMultiTx = signingPayloads.length > 1;
  const chain = signingPayloads[0]!.chain;
  const rootAccountId = (signerWallet as PolkadotVaultWallet | SingleShardWallet)?.rootAccountId;

  useEffect(() => {
    if (countdown === 0 && !isScanStep) {
      setValidationError(ValidationErrors.EXPIRED);
    }
  }, [countdown, isScanStep]);

  const handleSignature = async (scanResult: HexString | HexString[]): Promise<void> => {
    const signatures = Array.isArray(scanResult)
      ? scanResult.map(operationSignUtils.transformEcdsaSignature)
      : [scanResult].map(operationSignUtils.transformEcdsaSignature);

    const accountIds = signingPayloads.map((p) => p.signatory.accountId);

    let isVerified = false;

    if (signatures.length > 1) {
      isVerified = true;
    } else {
      isVerified = signatures.every((signature, index) => {
        const payload = txPayloads.at(index);
        const accountId = accountIds.at(index);

        if (nullable(payload) || nullable(accountId)) return false;

        const verifiablePayload = payload.slice(1);
        const verifiableComplexPayload = payload.slice(2);

        const isVerified = transactionService.verifySignature(verifiablePayload, signature, accountId);
        const isComplexVerified = transactionService.verifySignature(verifiableComplexPayload, signature, accountId);

        return isVerified || isComplexVerified;
      });
    }

    const balanceValidationError = validateBalance && (await validateBalance());

    if (!isVerified || balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);

      return;
    }

    if (eraInfo) {
      const currentBlock = await getCurrentBlockNumber(signingPayloads[0]!.api);
      const expired = isEraExpired(currentBlock, eraInfo.blockNumber, eraInfo.mortalLength);

      if (expired) {
        setValidationError(ValidationErrors.EXPIRED);

        return;
      }
    }

    onResult(signatures, txPayloads);
  };

  const scanAgain = () => {
    setTxPayloads([]);
  };

  if (cameraStatus === 'checking') {
    return (
      <Box width="100%" height="490px" verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  if (cameraStatus === 'denied' || cameraStatus === 'no_input') {
    return (
      <div className="flex w-full flex-col items-center gap-4 px-5 py-4">
        <CameraAccessAlert status={cameraStatus} onRetry={retryCamera} />
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>
    );
  }

  if (isScanStep) {
    return (
      <div className="w-full px-5 py-4">
        <div className="flex w-full flex-col items-center">
          {signerWallet && (
            <div className="mb-1 flex h-8 items-center gap-x-2">
              <FootnoteText className="whitespace-nowrap text-text-secondary">{t('signing.signer')}</FootnoteText>
              <WalletIcon type={signerWallet.type} size={16} />
              <FootnoteText className="text-text-secondary">{signerWallet.name}</FootnoteText>
            </div>
          )}

          {isMultiTx ? (
            <ScanMultiframeQr
              countdown={countdown}
              rootAccountId={rootAccountId}
              signingPayloads={signingPayloads}
              onGoBack={onGoBack}
              onResetCountdown={resetCountdown}
              onEraInfo={setEraInfo}
              onResult={setTxPayloads}
            />
          ) : (
            <ScanSingleframeQr
              chain={chain}
              api={signingPayloads[0]!.api}
              countdown={countdown}
              rootAccountId={rootAccountId}
              account={signingPayloads[0]!.signatory}
              extrinsic={signingPayloads[0]!.extrinsic}
              onGoBack={onGoBack}
              onResetCountdown={resetCountdown}
              onEraInfo={setEraInfo}
              onResult={(payload) => setTxPayloads([payload])}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center overflow-hidden rounded-lg">
      <QrReaderWrapper
        isMultiFrame={isMultiTx}
        countdown={countdown || 0}
        validationError={validationError}
        onResult={handleSignature}
        onGoBack={scanAgain}
      />
    </div>
  );
};
