import ParitySignerSignatureReader from '@renderer/screens/Signing/ParitySignerSignatureReader/ParitySignerSignatureReader';
import MultiframeSignatureReader from '@renderer/screens/Signing/MultiframeSignatureReader/MultiframeSignatureReader';
import { Block, Button } from '@renderer/components/ui';
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

  const handleResult = (data: string | string[]) => {
    if (Array.isArray(data)) {
      onResult(data as HexString[]);
    } else {
      onResult([data as HexString]);
    }
  };

  const QrReader = multiQr ? MultiframeSignatureReader : ParitySignerSignatureReader;

  return (
    <div className="overflow-y-auto">
      <section className="flex flex-col items-center gap-y-5 mx-auto w-[500px] rounded-2lg bg-shade-2 p-5">
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
      </section>
    </div>
  );
};
