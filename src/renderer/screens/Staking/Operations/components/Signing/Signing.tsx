import { useEffect } from 'react';

import QrReaderWrapper from '@renderer/components/common/QrCode/QrReader/QrReaderWrapper';
import { HexString } from '@renderer/domain/shared-kernel';

type Props = {
  multiQr: boolean;
  countdown?: number;
  onGoBack: () => void;
  onResult: (signatures: HexString[]) => void;
};

export const Signing = ({ multiQr, countdown, onResult, onGoBack }: Props) => {
  useEffect(() => {
    if (countdown === 0) {
      onGoBack();
    }
  }, [countdown]);

  const handleResult = (data: string | string[]) => {
    if (Array.isArray(data)) {
      onResult(data as HexString[]);
    } else {
      onResult([data as HexString]);
    }
  };

  return (
    <div className="w-[440px]">
      <QrReaderWrapper
        isMultiFrame={multiQr}
        className="w-full rounded-2lg"
        countdown={countdown || 0}
        onResult={handleResult}
        onGoBack={onGoBack}
      />
    </div>
  );
};
