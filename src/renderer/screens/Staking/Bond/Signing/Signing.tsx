import { useEffect, useState } from 'react';

import { Block, Button } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { HexString } from '@renderer/domain/shared-kernel';
import MultiframeSignatureReader from '@renderer/screens/Signing/MultiframeSignatureReader/MultiframeSignatureReader';
import { DEFAULT_QR_LIFETIME } from '@renderer/shared/utils/constants';

type Props = {
  onResult: (signatures: HexString[]) => void;
  onGoBack: () => void;
};

const Signing = ({ onResult, onGoBack }: Props) => {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState(DEFAULT_QR_LIFETIME);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  return (
    <div className="overflow-y-auto">
      <section className="flex flex-col items-center gap-y-5 mx-auto w-[500px] rounded-2lg bg-shade-2 p-5">
        <Block className="flex flex-col items-center gap-y-2.5">
          <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>
          <div className="h-[460px]">
            <MultiframeSignatureReader
              className="w-full rounded-2lg"
              countdown={countdown}
              size={460}
              onResult={onResult}
            />
          </div>
        </Block>

        {countdown === 0 && (
          <Button variant="fill" pallet="primary" weight="lg" onClick={onGoBack}>
            {t('signing.generateNewQrButton')}
          </Button>
        )}
      </section>
    </div>
  );
};

export default Signing;
