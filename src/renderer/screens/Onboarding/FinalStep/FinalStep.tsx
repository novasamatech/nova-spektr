import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { WalletType } from '@renderer/domain/wallet';
import LaptopImg from '@images/misc/onboarding/laptop.png';
// import CardImg from '@images/misc/onboarding/default-card.png';
import ParityImg from '@images/misc/onboarding/parity-card.png';
import WatchImg from '@images/misc/onboarding/watch-card.png';
import Paths from '@renderer/routes/paths';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  walletType: WalletType;
};

const FinalStep = ({ walletType }: Props) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    setTimeout(() => {
      navigate(Paths.BALANCES);
    }, 2000);
  }, []);

  return (
    <div className="relative flex justify-center items-center">
      <img className="mt-[66px]" src={LaptopImg} alt="" width={757} height={410} />
      {walletType === WalletType.WATCH_ONLY && (
        <img className="absolute" src={WatchImg} alt="" width={260} height={120} />
      )}
      {walletType === WalletType.PARITY && <img className="absolute" src={ParityImg} alt="" width={260} height={120} />}
      <p className="absolute mt-[160px] text-neutral-variant font-semibold">{t('onboarding.readyToUserLabel')}</p>
    </div>
  );
};

export default FinalStep;
