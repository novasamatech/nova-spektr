import { useEffect, useState } from 'react';
import { ApiPromise } from '@polkadot/api';

import QrReaderWrapper from '@renderer/components/common/QrCode/QrReader/QrReaderWrapper';
import { AccountId, HexString } from '@renderer/domain/shared-kernel';
import { ValidationErrors } from '@renderer/shared/utils/validation';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Transaction } from '@renderer/domain/transaction';

type Props = {
  multiQr: boolean;
  api: ApiPromise;
  transaction: Transaction;
  countdown: number;
  accountId: AccountId;
  onGoBack: () => void;
  onResult: (signatures: HexString[]) => void;
};

export const Signing = ({ multiQr, countdown, transaction, api, accountId, onResult, onGoBack }: Props) => {
  const [validationError, setValidationError] = useState<ValidationErrors>();
  const { createPayload, verifySignature } = useTransaction();
  const [txPayload, setTxPayload] = useState<Uint8Array>();

  useEffect(() => {
    if (txPayload) return;

    setupTransaction().catch(() => console.warn('ScanSingleframeQr | setupTransaction() failed'));
  }, []);

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload } = await createPayload(transaction, api);

      setTxPayload(payload);
    } catch (error) {
      console.warn(error);
    }
  };

  useEffect(() => {
    if (countdown === 0) {
      onGoBack();
    }
  }, [countdown]);

  const handleResult = (data: string | string[]) => {
    const signatures = Array.isArray(data) ? (data as HexString[]) : [data as HexString];

    const isVerified = signatures.every(
      (signature) => txPayload && verifySignature(txPayload, signature as HexString, accountId),
    );

    if (!isVerified) {
      setValidationError(ValidationErrors.INVALID_SIGNATURE);
    } else {
      onResult(signatures);
    }
  };

  return (
    <div className="w-[440px]">
      <QrReaderWrapper
        isMultiFrame={multiQr}
        className="w-full rounded-2lg"
        countdown={countdown || 0}
        validationError={validationError}
        onResult={handleResult}
        onGoBack={onGoBack}
      />
    </div>
  );
};
