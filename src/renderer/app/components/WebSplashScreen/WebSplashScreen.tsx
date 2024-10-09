import { Animation } from '@shared/ui/Animation/Animation';

import illustraction1 from './assets/illustraction-1.png';
import iconUrl from './assets/spectr-icon.svg';
import nameUrl from './assets/spectr-name.svg';

export const WebSplashScreen = () => {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center font-manrope duration-500 animate-in fade-in">
      <div className="fixed -top-[1060px] left-[50%] h-[1140px] w-[1140px] -translate-x-[50%] rounded-full bg-[#FF57E4] blur-[215px]" />
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
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <p className="text-[46.5px] font-bold text-black">Multisig operations</p>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <p className="text-[24px] font-normal text-black">
                Enhance the security of your assets with Multisig Wallets in Nova Spektr! Multisigs are super easy to
                use and allow you to further secure access to your Polkadot assets, requiring multiple signatures for
                transaction approval.
              </p>
            </div>
          </div>
          <div className="hidden lg:block">
            <img className="block h-auto w-[670px]" src={illustraction1} />
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
