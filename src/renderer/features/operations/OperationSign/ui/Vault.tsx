import { useEffect, useState } from 'react';

import { type Address, type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useCountdown } from '@/shared/lib/hooks';
import { ValidationErrors, nullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { QrReaderWrapper, ScanMultiframeQr, ScanSingleframeQr, transactionService } from '@/entities/transaction';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
import { operationSignUtils } from '../lib/operation-sign-utils';
import { type InnerSigningProps } from '../lib/types';

export const Vault = ({
  apis,
  signingPayloads,
  signerWallet,
  validateBalance,
  onGoBack,
  onResult,
}: InnerSigningProps) => {
  const { t } = useI18n();

  const [countdown, resetCountdown] = useCountdown(Object.values(apis));
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);
  const [validationError, setValidationError] = useState<ValidationErrors>();

  const isScanStep = !txPayloads.length;
  const isMultiframe = signingPayloads.length > 1;

  useEffect(() => {
    if (countdown === 0) {
      scanAgain();
    }
  }, [countdown]);

  const handleSignature = async (scanResult: HexString | HexString[]): Promise<void> => {
    const signatures = Array.isArray(scanResult)
      ? scanResult.map(operationSignUtils.transformEcdsaSignature)
      : [scanResult].map(operationSignUtils.transformEcdsaSignature);

    const accountIds = signingPayloads.map((p) => p.signatory?.accountId ?? p.account.accountId);

    let isVerified = false;

    if (signatures.length > 1) {
      // TODO: Research complex verification
      // TODO: research multishard signature verification
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
    } else {
      onResult(signatures, txPayloads);
    }
  };

  const getSignerAddress = (): Address => {
    if (!walletUtils.isPolkadotVault(signerWallet)) {
      return signingPayloads[0].transaction.address;
    }

    const root = accountUtils.getBaseAccount(signerWallet.accounts, signerWallet.id);

    return root ? toAddress(root.accountId, { prefix: 1 }) : signingPayloads[0].transaction.address;
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
                <FootnoteText className="text-text-secondary">{t('signing.signer')}</FootnoteText>

                <div className="flex w-full items-center gap-x-2 px-2">
                  <WalletIcon className="shrink-0" type={signerWallet.type} size={16} />
                  <FootnoteText className="w-max text-text-secondary">{signerWallet.name}</FootnoteText>
                </div>
              </div>
            </div>
          )}

          {isMultiframe ? (
            <ScanMultiframeQr
              apis={apis}
              countdown={countdown}
              signerWallet={signerWallet!}
              signingPayloads={signingPayloads}
              onGoBack={onGoBack}
              onResetCountdown={resetCountdown}
              onResult={setTxPayloads}
            />
          ) : (
            <ScanSingleframeQr
              chainId={signingPayloads[0].chain.chainId}
              api={apis[signingPayloads[0].chain.chainId]}
              address={getSignerAddress()}
              countdown={countdown}
              account={signingPayloads[0].signatory || signingPayloads[0].account}
              signerWallet={signerWallet!}
              transaction={signingPayloads[0].transaction}
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
    <div className="flex w-[440px] flex-col items-center gap-y-2.5 rounded-b-lg bg-black">
      <QrReaderWrapper
        isMultiFrame={isMultiframe}
        countdown={countdown || 0}
        validationError={validationError}
        onResult={handleSignature}
        onGoBack={scanAgain}
      />
    </div>
  );
};
