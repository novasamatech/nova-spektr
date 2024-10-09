import { useMemo } from 'react';

import { Animation } from '@shared/ui/Animation/Animation';

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
    title: 'Multisig operations',
    description:
      'Enhance the security of your assets with Multisig Wallets in Nova Spektr! Multisigs are super easy to use and allow you to further secure access to your Polkadot assets, requiring multiple signatures for transaction approval.',
  },
  {
    image: promo2,
    title: 'Proxy Wallets',
    description:
      "Delegate Authority for certain operations to secondary accounts with Nova Spektr's Proxy feature! Manage frequent actions such as changing validator nominations from an easier to access account and more!",
  },
  {
    image: promo3,
    title: 'WalletConnect 2.0',
    description:
      'Nova Spektr supports WalletConnect v2! Seamlessly connect to Nova Spektr with any WalletConnect-compatible wallet for a smooth and secure experience.',
  },
  {
    image: promo4,
    title: 'OpenGov',
    description:
      'Decide the fate of the network! Nova Spektr supports Polkadot OpenGov, empowering you to vote, delegate and more! Nova Spektr makes it easier than ever before to observe, participate and delegate in OpenGov!',
  },
  {
    image: promo5,
    title: 'Staking',
    description:
      "Nova Spektr makes it easy to stake your assets and earn rewards while contributing to the network's security! Using Nova Spektr you can easily stake your DOT, KSM and more in seconds from your multisig accounts!",
  },
  {
    image: promo6,
    title: 'Open Source & Trustless',
    description:
      "Don't trust, verify. Nova Spektr is fully open-source, meaning that anyone in the world can review its code and ensure transparency and security.",
  },
];

export const WebSplashScreen = () => {
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
              <p className="text-[19.6px] font-bold uppercase tracking-[5px] text-text-secondary">Feature</p>
              <p className="text-[46.5px] font-bold text-black">{screen.title}</p>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <p className="text-[24px] font-normal text-black">{screen.description}</p>
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
