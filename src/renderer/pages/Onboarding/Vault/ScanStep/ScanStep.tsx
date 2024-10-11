import { useI18n } from '@app/providers';
import onboarding_tutorial from '@shared/assets/video/onboarding_tutorial.mp4';
import onboarding_tutorial_webm from '@shared/assets/video/onboarding_tutorial.webm';
import { Button, HeaderTitleText, SmallTitleText } from '@shared/ui';
import { type SeedInfo } from '@entities/transaction';
import KeyQrReader from '../KeyQrReader/KeyQrReader';

type Props = {
  onBack: () => void;
  onNextStep: (payload: SeedInfo[]) => void;
};

const ScanStep = ({ onBack, onNextStep }: Props) => {
  const { t } = useI18n();

  return (
    <>
      <div className="flex w-full min-w-96 max-w-[472px] grow flex-col rounded-l-lg bg-white px-5 py-4">
        <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.vault.scanTitle')}</SmallTitleText>

        <div>
          <KeyQrReader className="rounded-2lg" size={[432, 288]} onResult={onNextStep} />
        </div>

        <div className="flex flex-1 items-end justify-between">
          <Button variant="text" onClick={onBack}>
            {t('onboarding.backButton')}
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-col bg-black">
        <video className="h-full object-contain" autoPlay loop>
          <source src={onboarding_tutorial_webm} type="video/webm" />
          <source src={onboarding_tutorial} type="video/mp4" />
        </video>
      </div>
    </>
  );
};

export default ScanStep;
