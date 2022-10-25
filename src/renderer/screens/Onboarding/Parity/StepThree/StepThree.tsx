import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  qrData: SeedInfo;
  onNextStep: () => void;
  onPrevStep: () => void;
};

const StepThree = (_: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col gap-10 justify-center items-center pt-7.5">
      <h2 className="text-2xl leading-10 font-normal text-neutral-variant">
        {t('onboarding.paritysigner.choseWalletNameLabel')}
      </h2>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <div className="flex gap-10">content</div>
    </div>
  );
};

export default StepThree;
