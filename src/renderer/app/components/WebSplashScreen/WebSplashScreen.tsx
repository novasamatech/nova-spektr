import { useMemo } from 'react';

import { Animation } from '@/shared/ui';
import { useI18n } from '../../providers';

import promo1 from './assets/promo-1.png';
import promo2 from './assets/promo-2.png';
import promo3 from './assets/promo-3.png';
import promo4 from './assets/promo-4.png';
import promo5 from './assets/promo-5.png';
import promo6 from './assets/promo-6.png';
import iconUrl from './assets/spectr-icon.svg';
import nameUrl from './assets/spectr-name.svg';

const screens = [
  {
    image: promo1,
    title: 'splashscreen.multisig.title',
    description: 'splashscreen.multisig.description',
  },
  {
    image: promo2,
    title: 'splashscreen.proxy.title',
    description: 'splashscreen.proxy.description',
  },
  {
    image: promo3,
    title: 'splashscreen.walletConnect.title',
    description: 'splashscreen.walletConnect.description',
  },
  {
    image: promo4,
    title: 'splashscreen.opengov.title',
    description: 'splashscreen.opengov.description',
  },
  {
    image: promo5,
    title: 'splashscreen.staking.title',
    description: 'splashscreen.staking.description',
  },
  {
    image: promo6,
    title: 'splashscreen.oss.title',
    description: 'splashscreen.oss.description',
  },
];

export const WebSplashScreen = () => {
  const { t } = useI18n();

  const screen = useMemo(() => {
    return screens[Math.floor(Math.random() * screens.length)];
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center font-manrope duration-500 animate-in fade-in">
      <div className="fixed -top-[1100px] left-[50%] h-[1140px] w-[1140px] -translate-x-[50%] rounded-full bg-[#FF57E4] blur-[215px]" />
      <div className="z-10 flex flex-col items-center gap-[86px]">
        <div className="flex items-center gap-[88px]">
          <div className="flex flex-col gap-[94px]">
            <div className="flex items-center gap-4">
              <img className="h-24 w-24" src={iconUrl} />
              <img className="h-auto w-32" src={nameUrl} />
            </div>
            <div className="flex w-[500px] flex-col gap-7.5 leading-[normal]">
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <p className="text-[19.6px] font-bold uppercase tracking-[5px] text-text-secondary">
                {t('splashscreen.title')}
              </p>
              <p className="text-[46.5px] font-bold text-black">{t(screen.title)}</p>
              <p className="text-[24px] font-normal text-black">{t(screen.description)}</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <img className="block h-auto w-[670px]" src={screen.image} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-[7px]">
          <Animation variant="loading" loop />
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <p className="text-[24px] font-normal text-black">Nova Spektr now loading</p>
        </div>
      </div>
    </div>
  );
};
