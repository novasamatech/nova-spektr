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
  accountIds: AccountId[];
  onGoBack: () => void;
  onResult: (signatures: HexString[]) => void;
};

export const Signing = ({ multiQr, countdown, transaction, api, accountIds, onResult, onGoBack }: Props) => {
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

    const isVerified = signatures.every((signature, index) => {
      const verifiablePayload = txPayload?.slice(2);
      const isVerified =
        verifiablePayload && verifySignature(verifiablePayload, signature as HexString, accountIds[index]);

      return isVerified;
    });

    if (!isVerified) {
      setValidationError(ValidationErrors.INVALID_SIGNATURE);
    } else {
      onResult(signatures);
    }
  };

  return (
    <div className="flex flex-col items-center gap-y-2.5 w-[440px] rounded-b-lg bg-black">
      <QrReaderWrapper
        isMultiFrame={multiQr}
        countdown={countdown || 0}
        validationError={validationError}
        onResult={handleResult}
        onGoBack={onGoBack}
      />
    </div>
  );
};
