import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import LaptopImg from '@images/misc/onboarding/laptop.png';
// import CardImg from '@images/misc/onboarding/default-card.png';
import ParityImg from '@images/misc/onboarding/parity-card.png';
import WatchImg from '@images/misc/onboarding/watch-card.png';
import { Paths } from '@renderer/app/providers';
import { useI18n } from '@renderer/app/providers';
import { SigningType } from '@renderer/domain/shared-kernel';

type Props = {
  signingType: SigningType;
};

const FinalStep = ({ signingType }: Props) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    setTimeout(() => {
      navigate(Paths.ASSETS);
    }, 2000);
  }, []);

  return (
    <div className="relative flex justify-center items-center">
      <img className="mt-[66px]" src={LaptopImg} alt="" width={757} height={410} />
      {signingType === SigningType.WATCH_ONLY && (
        <img className="absolute" src={WatchImg} alt="" width={260} height={120} />
      )}
      {signingType === SigningType.PARITY_SIGNER && (
        <img className="absolute" src={ParityImg} alt="" width={260} height={120} />
      )}
      <p className="absolute mt-[160px] text-neutral-variant font-semibold">{t('onboarding.readyToUseLabel')}</p>
    </div>
  );
};

export default FinalStep;
