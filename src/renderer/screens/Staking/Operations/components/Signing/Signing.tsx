import { useEffect } from 'react';

import QrSignatureReader from '@renderer/screens/Signing/QrReaderWrapper/QrReaderWrapper';
import { Block, Plate } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { HexString } from '@renderer/domain/shared-kernel';

type Props = {
  multiQr: boolean;
  countdown?: number;
  onGoBack: () => void;
  onResult: (signatures: HexString[]) => void;
};

export const Signing = ({ multiQr, countdown, onResult, onGoBack }: Props) => {
  const { t } = useI18n();

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
    <div className="overflow-y-auto flex-1">
      <Plate as="section" className="flex flex-col items-center gap-y-5 mx-auto w-[600px]">
        <Block className="flex flex-col items-center gap-y-2.5 p-5">
          <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>
          <div className="h-[460px]">
            <QrSignatureReader
              isMultiFrame={multiQr}
              className="w-full rounded-2lg"
              countdown={countdown || 0}
              size={460}
              onResult={handleResult}
            />
          </div>
        </Block>
      </Plate>
    </div>
  );
};
