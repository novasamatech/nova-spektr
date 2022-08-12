import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import Paths from '@renderer/routes/paths';
import { SplashScreen } from '@renderer/components/common';
import { Button } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18Context';
import { createSimpleWallet, WalletType } from '@renderer/domain/wallet';
import { useWallet } from '@renderer/services/wallet/walletService';

const Onboarding = () => {
  const navigate = useNavigate();
  const { onLocaleChange } = useI18n();
  const { getWallets, addWallet } = useWallet();

  const [isWalletsLoading, setIsWalletsLoading] = useState(true);

  useEffect(() => {
    const fetchWallets = async () => {
      const wallets = await getWallets();
      setIsWalletsLoading(false);

      if (wallets.length === 0) return;

      navigate(Paths.BALANCES, { replace: true });
    };

    fetchWallets();
  }, []);

  const onLanguageSwitch = async () => {
    try {
      await onLocaleChange('ru');
    } catch (error) {
      console.warn(error);
    }
  };

  const onAddTestWallet = async () => {
    const newWallet = createSimpleWallet({
      name: 'test_wallet',
      type: WalletType.WATCH_ONLY,
      mainAccounts: [],
      chainAccounts: [],
      isMultisig: false,
    });

    await addWallet(newWallet);
  };

  if (isWalletsLoading) {
    return <SplashScreen />;
  }

  return (
    <main className="px-9 pt-5 pb-6 flex flex-col h-screen bg-stripes bg-cover">
      <Outlet />

      <div className="flex justify-between">
        <Button className="w-max" variant="fill" pallet="primary" onClick={onLanguageSwitch}>
          Switch language
        </Button>
        <Button variant="outline" pallet="primary" onClick={onAddTestWallet}>
          Add test wallet
        </Button>
      </div>
    </main>
  );
};

export default Onboarding;
