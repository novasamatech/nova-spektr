import { useState } from 'react';

import { type HexString, type PolkadotVaultWallet, type SingleShardWallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useCountdown } from '@/shared/lib/hooks';
import { ValidationErrors, getCurrentBlockNumber, isEraExpired, nullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { QrReaderWrapper, ScanMultiframeQr, ScanSingleframeQr, transactionService } from '@/entities/transaction';
import { operationSignUtils } from '../lib/operation-sign-utils';
import { type SigningProps } from '../lib/types';

export const PolkadotVault = ({ signingPayloads, signerWallet, validateBalance, onGoBack, onResult }: SigningProps) => {
  const { t } = useI18n();

  const [countdown, resetCountdown] = useCountdown();
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);
  const [eraInfo, setEraInfo] = useState<{ blockNumber: number; mortalLength: number } | null>(null);
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const isScanStep = !txPayloads.length;
  const isMultiTx = signingPayloads.length > 1;
  const chain = signingPayloads[0]!.chain;
  const rootAccountId = (signerWallet as PolkadotVaultWallet | SingleShardWallet)?.rootAccountId;

  const handleSignature = async (scanResult: HexString | HexString[]): Promise<void> => {
    const signatures = Array.isArray(scanResult)
      ? scanResult.map(operationSignUtils.transformEcdsaSignature)
      : [scanResult].map(operationSignUtils.transformEcdsaSignature);

    const accountIds = signingPayloads.map((p) => p.signatory.accountId);

    console.group('[SpektrVaultDebug] Stage 3: Signature received from Vault');
    console.log('signatures count:', signatures.length);
    for (const [i, sig] of signatures.entries()) {
      console.log(`signature[${i}]:`, sig);
    }
    console.log('accountIds:', accountIds);
    console.log('txPayloads count:', txPayloads.length);
    for (const [i, p] of txPayloads.entries()) {
      const buf = Buffer.from(p);
      console.log(`txPayload[${i}] hex (${p.length} bytes):`, buf.toString('hex'));
    }

    let isVerified = false;

    if (signatures.length > 1) {
      isVerified = true;
      console.log('Multi-signature — skipping verification');
    } else {
      isVerified = signatures.every((signature, index) => {
        const payload = txPayloads.at(index);
        const accountId = accountIds.at(index);

        if (nullable(payload) || nullable(accountId)) return false;

        const verifiablePayload = payload.slice(1);
        const verifiableComplexPayload = payload.slice(2);

        const isVerified = transactionService.verifySignature(verifiablePayload, signature, accountId);
        const isComplexVerified = transactionService.verifySignature(verifiableComplexPayload, signature, accountId);

        console.log(`Verification [${index}]: standard=${isVerified} complex=${isComplexVerified}`);
        return isVerified || isComplexVerified;
      });
    }

    console.log('Overall verification result:', isVerified);

    const balanceValidationError = validateBalance && (await validateBalance());
    if (balanceValidationError) {
      console.warn('[SpektrVaultDebug] Balance validation error:', balanceValidationError);
    }
    console.groupEnd();

    if (!isVerified || balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);

      return;
    }

    // Check if the mortal era has expired before submitting
    if (eraInfo) {
      const currentBlock = await getCurrentBlockNumber(signingPayloads[0]!.api);
      const expired = isEraExpired(currentBlock, eraInfo.blockNumber, eraInfo.mortalLength);
      console.log(
        '[SpektrVaultDebug] Era check: currentBlock=',
        currentBlock,
        'eraBlock=',
        eraInfo.blockNumber,
        'period=',
        eraInfo.mortalLength,
        'expired=',
        expired,
      );

      if (expired) {
        setValidationError(ValidationErrors.EXPIRED);

        return;
      }
    }

    console.log('[SpektrVaultDebug] Stage 3 → Signature verified, proceeding to submit');
    onResult(signatures, txPayloads);
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
