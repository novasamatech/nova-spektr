import { useEffect } from 'react';

import QrReaderWrapper from '@renderer/screens/Signing/QrReaderWrapper/QrReaderWrapper';
import { HexString } from '@renderer/domain/shared-kernel';
import { ModalMock } from '@renderer/screens/Staking/Operations/components';

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
    <ModalMock>
      <QrReaderWrapper
        isMultiFrame={multiQr}
        className="w-full rounded-2lg"
        countdown={countdown || 0}
        onResult={handleResult}
        onGoBack={onGoBack}
      />
    </ModalMock>
  );
};
