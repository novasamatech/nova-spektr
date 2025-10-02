import onboarding_tutorial from '@/shared/assets/video/onboarding_tutorial.mp4';
import onboarding_tutorial_webm from '@/shared/assets/video/onboarding_tutorial.webm';
import { useI18n } from '@/shared/i18n';
import { Modal } from '@/shared/ui-kit';
import { type SeedInfo } from '@/entities/transaction';

import { KeyQrReader } from './KeyQrReader';

type Props = {
  onBack: () => void;
  onComplete: (payload: SeedInfo) => void;
};

export const ScanStep = ({ onBack, onComplete }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full">
      <div className="flex w-[472px] flex-col">
        <Modal.Title>{t('onboarding.vault.title')}</Modal.Title>
        <div className="flex grow">
          <KeyQrReader size={[432, 288]} onComplete={onComplete} onBack={onBack} />
        </div>
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
