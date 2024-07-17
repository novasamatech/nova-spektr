import { useEffect, useState } from 'react';

import { useCountdown } from '@shared/lib/hooks';
import { ValidationErrors, toAddress } from '@shared/lib/utils';
import { QrReaderWrapper, ScanMultiframeQr, ScanSingleframeQr, useTransaction } from '@entities/transaction';
import { accountUtils, walletUtils } from '@entities/wallet';
import type { Address, HexString } from '@shared/core';
import type { InnerSigningProps } from '../lib/types';
import { operationSignUtils } from '../lib/operation-sign-utils';

export const Vault = ({
  apis,
  signingPayloads,
  signerWallet,
  validateBalance,
  onGoBack,
  onResult,
}: InnerSigningProps) => {
  const { verifySignature } = useTransaction();

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

  const handleSignature = async (data: string | string[]): Promise<void> => {
    const isMultishard = Array.isArray(data);
    const signatures = isMultishard
      ? (data as HexString[]).map(operationSignUtils.transformEcdsaSignature)
      : [data as HexString].map(operationSignUtils.transformEcdsaSignature);

    const accountIds = signingPayloads.map((p) => p.signatory?.accountId || p.account.accountId);

    const isVerified = signatures.every((signature, index) => {
      // TODO: Research complex verification
      // TODO: research multishard signature verification
      if (isMultishard) return true;

      const payload = txPayloads[index];
      const verifiablePayload = payload?.slice(1);
      const verifiableComplexPayload = payload?.slice(2);

      const isVerified =
        verifiablePayload && verifySignature(verifiablePayload, signature as HexString, accountIds[index]);
      const isComplexVerified =
        verifiableComplexPayload &&
        verifySignature(verifiableComplexPayload, signature as HexString, accountIds[index]);

      return isVerified || isComplexVerified;
    });

    const balanceValidationError = validateBalance && (await validateBalance());

    if (!isVerified || balanceValidationError) {
      setValidationError(balanceValidationError || ValidationErrors.INVALID_SIGNATURE);
    } else {
      onResult(signatures, txPayloads);
    }
  };

  const getSignerAddress = (): Address => {
    if (!walletUtils.isPolkadotVault(signerWallet)) return signingPayloads[0].transaction.address;

    const root = accountUtils.getBaseAccount(signerWallet.accounts, signerWallet.id);

    return root ? toAddress(root.accountId, { prefix: 1 }) : signingPayloads[0].transaction.address;
  };

  const scanAgain = () => {
    setTxPayloads([]);
  };

  if (isScanStep) {
    return (
      <div className="w-[440px] px-5 py-4">
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
    );
  }

  return (
    <div className="flex flex-col items-center gap-y-2.5 w-[440px] rounded-b-lg bg-black">
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
