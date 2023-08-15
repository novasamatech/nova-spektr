import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { SigningProps } from '@renderer/features/operation';
import { useCountdown } from '@renderer/shared/lib/hooks';
import ScanMultiframeQr from '@renderer/components/common/Scanning/ScanMultiframeQr';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';
import { ValidationErrors } from '@renderer/shared/lib/utils';
import { useTransaction } from '@renderer/entities/transaction';
import { HexString } from '@renderer/domain/shared-kernel';
import QrReaderWrapper from '@renderer/components/common/QrCode/QrReader/QrReaderWrapper';

export const VaultSigning = ({
  chainId,
  api,
  addressPrefix,
  validateBalance,
  onGoBack,
  accounts,
  signatory,
  transactions,
  onResult,
}: SigningProps) => {
  const { verifySignature } = useTransaction();

  const [countdown, resetCountdown] = useCountdown(api);
  const [unsignedTxs, setUnsignedTxs] = useState<UnsignedTransaction[]>([]);
  const [txPayloads, setTxPayloads] = useState<Uint8Array[]>([]);

  const [validationError, setValidationError] = useState<ValidationErrors>();

  const isScanStep = !unsignedTxs.length && !txPayloads.length;
  const isMultiframe = transactions.length > 1;

  useEffect(() => {
    if (countdown === 0) {
      scanAgain();
    }
  }, [countdown]);

  const handleSignature = async (data: string | string[]) => {
    const isMultishard = Array.isArray(data);
    const signatures = isMultishard ? (data as HexString[]) : [data as HexString];
    const accountIds = isMultiframe ? accounts.map((t) => t.accountId) : [(signatory || accounts[0])?.accountId];

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
      onResult(signatures, unsignedTxs);
    }
  };

  const scanAgain = () => {
    setUnsignedTxs([]);
    setTxPayloads([]);
  };

  return (
    <>
      {isScanStep && (
        <div className="w-[440px] px-5 py-4">
          {isMultiframe ? (
            <ScanMultiframeQr
              api={api}
              addressPrefix={addressPrefix}
              countdown={countdown}
              accounts={accounts}
              transactions={transactions}
              chainId={chainId}
              onGoBack={onGoBack}
              onResetCountdown={resetCountdown}
              onResult={(unsignedTx, payloads) => {
                setUnsignedTxs(unsignedTx);
                setTxPayloads(payloads);
              }}
            />
          ) : (
            <ScanSingleframeQr
              api={api}
              addressPrefix={addressPrefix}
              countdown={countdown}
              account={signatory || accounts[0]}
              transaction={transactions[0]}
              chainId={chainId}
              onGoBack={onGoBack}
              onResetCountdown={resetCountdown}
              onResult={(unsignedTx, payload) => {
                setUnsignedTxs([unsignedTx]);
                setTxPayloads([payload]);
              }}
            />
          )}
        </div>
      )}
      {!isScanStep && (
        <div className="flex flex-col items-center gap-y-2.5 w-[440px] rounded-b-lg bg-black">
          <QrReaderWrapper
            isMultiFrame={isMultiframe}
            countdown={countdown || 0}
            validationError={validationError}
            onResult={handleSignature}
            onGoBack={scanAgain}
          />
        </div>
      )}
    </>
  );
};
