import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import QrReader from '../QrReader/QrReader';
import { Button, HeaderTitleText, SmallTitleText } from '@renderer/components/ui-redesign';
// @ts-ignore
import onboarding_tutorial from '@video/onboarding_tutorial.mp4';
// @ts-ignore
import onboarding_tutorial_webm from '@video/onboarding_tutorial.webm';

type Props = {
  onBack: () => void;
  onNextStep: (payload: SeedInfo[]) => void;
};

const ScanStep = ({ onBack, onNextStep }: Props) => {
  const { t } = useI18n();

  return (
    <>
      <div className="w-[472px] flex flex-col px-5 py-4 bg-white">
        <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.vault.scanTitle')}</SmallTitleText>

        <div className="rounded-2lg">
          <QrReader className="rounded-2lg" size={[432, 288]} onResult={onNextStep} />
        </div>

        <div className="flex-1 flex justify-between items-end">
          <Button variant="text" onClick={onBack}>
            {t('onboarding.backButton')}
          </Button>
        </div>
      </div>

      <div className="w-[472px] flex flex-col bg-black">
        <video className="object-contain h-full" autoPlay loop>
          <source src={onboarding_tutorial_webm} type="video/webm" />
          <source src={onboarding_tutorial} type="video/mp4" />
        </video>
      </div>
    </>
  );
};

export default ScanStep;
