import { Outlet } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';
import { createSimpleWallet, WalletType } from '@renderer/domain/wallet';
import { useWallet } from '@renderer/services/wallet/walletService';
import { Button } from '@renderer/components/ui';

const Onboarding = () => {
  const { LocaleComponent } = useI18n();
  const { addWallet } = useWallet();

  const onAddTestWallet = async () => {
    const newWallet = createSimpleWallet({
      name: 'test_wallet',
      type: WalletType.WATCH_ONLY,
      mainAccounts: [],
      chainAccounts: [],
    });

    await addWallet(newWallet);
  };

  return (
    <main className="px-9 pt-5 pb-6 flex flex-col h-screen bg-stripes bg-cover">
      <div className="flex-1">
        <Outlet />
      </div>

      <div className="flex justify-between">
        <LocaleComponent className="w-16" short top />
        <Button variant="outline" pallet="primary" onClick={onAddTestWallet}>
          Add test wallet
        </Button>
      </div>
    </main>
  );
};

export default Onboarding;
