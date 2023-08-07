import { useEffect, useState } from 'react';

import QrReaderWrapper from '@renderer/components/common/QrCode/QrReader/QrReaderWrapper';
import { AccountId, HexString } from '@renderer/domain/shared-kernel';
import { ValidationErrors } from '@renderer/shared/lib/utils';
import { useTransaction } from '@renderer/entities/transaction';

type Props = {
  multiQr: boolean;
  txPayloads: Uint8Array[];
  countdown: number;
  accountIds: AccountId[];
  onGoBack: () => void;
  onResult: (signatures: HexString[]) => void;
};

export const Signing = ({ multiQr, countdown, txPayloads, accountIds, onResult, onGoBack }: Props) => {
  const [validationError, setValidationError] = useState<ValidationErrors>();
  const { verifySignature } = useTransaction();

  useEffect(() => {
    if (countdown === 0) {
      onGoBack();
    }
  }, [countdown]);

  const handleResult = (data: string | string[]) => {
    const isMultishard = Array.isArray(data);
    const signatures = isMultishard ? (data as HexString[]) : [data as HexString];

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
