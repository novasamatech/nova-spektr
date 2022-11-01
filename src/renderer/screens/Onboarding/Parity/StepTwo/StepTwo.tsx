import ScanQr from '@images/misc/onboarding/scan-qr.svg';
import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import ParitySignerQrReader from '../ParitySignerQrReader/ParitySignerQrReader';

type Props = {
  onNextStep: (payload: SeedInfo[]) => void;
};

const StepTwo = ({ onNextStep }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex rounded-2lg bg-shade-2">
      <div className="flex-1">
        <img src={ScanQr} alt={t('oboarding.paritySigner.scanQRCodeAlt')} width={500} height={440} />
        <h2 className="text-neutral-variant text-center py-5 px-10 leading-5">
          {t('onboarding.paritySigner.scanQRLabel1')}{' '}
          <span className="font-bold">{t('onboarding.paritySigner.scanQRLabel2')}</span>{' '}
          {t('onboarding.paritySigner.scanQRLabel3')}
        </h2>
      </div>
      <div className="flex-1 shadow-surface rounded-2lg bg-white">
        <ParitySignerQrReader className="rounded-2lg" size={500} onResult={onNextStep} />
      </div>
    </div>
  );
};

export default StepTwo;
