import { useEffect, useMemo, useState } from 'react';

import { type HexString, type PolkadotVaultWallet, type SingleShardWallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useCountdown } from '@/shared/lib/hooks';
import { ValidationErrors, nullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { QrReaderWrapper, ScanMultiframeQr, ScanSingleframeQr, transactionService } from '@/entities/transaction';
import { operationSignUtils } from '../lib/operation-sign-utils';
import { type SigningProps } from '../lib/types';

export const PolkadotVault = ({ signingPayloads, signerWallet, validateBalance, onGoBack, onResult }: SigningProps) => {
  const { t } = useI18n();

  const apis = useMemo(() => signingPayloads.map((s) => s.api), [signingPayloads]);
  const [countdown, resetCountdown] = useCountdown(apis);
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const isScanStep = !txPayloads.length;
  const isMultiTx = signingPayloads.length > 1;
  const chain = signingPayloads[0]!.chain;
  const rootAccountId = (signerWallet as PolkadotVaultWallet | SingleShardWallet)?.rootAccountId;

  useEffect(() => {
    if (countdown === 0) {
      scanAgain();
    }
  }, [countdown]);

  const handleSignature = async (scanResult: HexString | HexString[]): Promise<void> => {
    const signatures = Array.isArray(scanResult)
      ? scanResult.map(operationSignUtils.transformEcdsaSignature)
      : [scanResult].map(operationSignUtils.transformEcdsaSignature);

    const accountIds = signingPayloads.map((p) => p.signatory.accountId);

    const isVerified = signatures.every((signature, index) => {
      const payload = txPayloads.at(index);
      const accountId = accountIds.at(index);

      if (nullable(payload) || nullable(accountId)) return false;

      const verifiablePayload = payload.slice(1);
      const verifiableComplexPayload = payload.slice(2);

      const isPayloadVerified = transactionService.verifySignature(verifiablePayload, signature, accountId);
      const isComplexVerified = transactionService.verifySignature(verifiableComplexPayload, signature, accountId);

      return isPayloadVerified || isComplexVerified;
    });

    const balanceValidationError = validateBalance && (await validateBalance());

    if (!isVerified || balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);
    } else {
      onResult(signatures, txPayloads);
    }
  };

  const scanAgain = () => {
    setTxPayloads([]);
  };

  if (isScanStep) {
    return (
      <div className="w-[440px] px-5 py-4">
        <div className="flex w-full flex-col items-center">
          {signerWallet && (
            <div className="mb-1 flex h-8 w-full items-center justify-center">
              <div className="flex h-full items-center justify-center gap-x-0.5">
                <FootnoteText className="whitespace-nowrap text-text-secondary">{t('signing.signer')}</FootnoteText>

                <div className="flex w-full items-center gap-x-2 px-2">
                  <WalletIcon type={signerWallet.type} size={16} />
                  <FootnoteText className="w-max text-text-secondary">{signerWallet.name}</FootnoteText>
                </div>
              </div>
            </div>
          )}

          {isMultiTx ? (
            <ScanMultiframeQr
              countdown={countdown}
              rootAccountId={rootAccountId}
              signingPayloads={signingPayloads}
              onGoBack={onGoBack}
              onResetCountdown={resetCountdown}
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
              onResult={(payload) => setTxPayloads([payload])}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[440px] flex-col items-center overflow-hidden rounded-lg">
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
