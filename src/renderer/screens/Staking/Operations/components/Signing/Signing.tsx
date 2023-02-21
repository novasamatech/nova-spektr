import { ApiPromise } from '@polkadot/api';
import { BN, BN_THOUSAND } from '@polkadot/util';
import { useEffect, useState } from 'react';

import { useChains } from '@renderer/services/network/chainsService';
import ParitySignerSignatureReader from '@renderer/screens/Signing/ParitySignerSignatureReader/ParitySignerSignatureReader';
import { Block, Button, Plate } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { HexString } from '@renderer/domain/shared-kernel';
import MultiframeSignatureReader from '@renderer/screens/Signing/MultiframeSignatureReader/MultiframeSignatureReader';
import { DEFAULT_QR_LIFETIME } from '@renderer/shared/utils/constants';

type Props = {
  api: ApiPromise;
  multiQr: boolean;
  onResult: (signatures: HexString[]) => void;
  onGoBack: () => void;
};

const Signing = ({ api, multiQr, onResult, onGoBack }: Props) => {
  const { t } = useI18n();
  const { getExpectedBlockTime } = useChains();

  const [countdown, setCountdown] = useState(DEFAULT_QR_LIFETIME);

  useEffect(() => {
    const expectedBlockTime = getExpectedBlockTime(api);

    setCountdown(expectedBlockTime.mul(new BN(DEFAULT_QR_LIFETIME)).div(BN_THOUSAND).toNumber() || 0);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  const QrReader = multiQr ? MultiframeSignatureReader : ParitySignerSignatureReader;

  const handleResult = (data: string | string[]) => {
    if (Array.isArray(data)) {
      onResult(data as HexString[]);
    } else {
      onResult([data as HexString]);
    }
  };

  return (
    <div className="overflow-y-auto">
      <Plate as="section" className="flex flex-col items-center gap-y-5 mx-auto w-[500px]">
        <Block className="flex flex-col items-center gap-y-2.5">
          <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>
          <div className="h-[460px]">
            <QrReader className="w-full rounded-2lg" countdown={countdown} size={460} onResult={handleResult} />
          </div>
        </Block>

        {countdown === 0 && (
          <Button variant="fill" pallet="primary" weight="lg" onClick={onGoBack}>
            {t('signing.generateNewQrButton')}
          </Button>
        )}
      </Plate>
    </div>
  );
};

export default Signing;
