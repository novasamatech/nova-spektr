import onboarding_tutorial from '@/shared/assets/video/onboarding_tutorial.mp4';
import onboarding_tutorial_webm from '@/shared/assets/video/onboarding_tutorial.webm';
import { useI18n } from '@/shared/i18n';
import { Button, SmallTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type SeedInfo } from '@/entities/transaction';
import KeyQrReader from '../KeyQrReader/KeyQrReader';

type Props = {
  onBack: () => void;
  onComplete: (payload: SeedInfo[]) => void;
};

export const ScanStep = ({ onBack, onComplete }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full">
      <div className="flex w-[472px] flex-col">
        <Modal.Title>{t('onboarding.vault.title')}</Modal.Title>

        <div className="flex grow flex-col gap-6 px-5 pt-6">
          <SmallTitleText>{t('onboarding.vault.scanTitle')}</SmallTitleText>
          <div>
            <KeyQrReader size={[432, 288]} onComplete={onComplete} />
          </div>
        </div>

        <Modal.Footer>
          <div className="flex w-full items-end">
            <Button variant="text" onClick={onBack}>
              {t('onboarding.backButton')}
            </Button>
          </div>
        </Modal.Footer>
      </div>

      <div className="flex-1 bg-black duration-500 animate-in fade-in">
        <video className="pointer-events-none h-full object-contain" autoPlay loop>
          <source src={onboarding_tutorial_webm} type="video/webm" />
          <source src={onboarding_tutorial} type="video/mp4" />
        </video>
      </div>
    </div>
  );
};
