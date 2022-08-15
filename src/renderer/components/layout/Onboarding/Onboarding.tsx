import { Outlet } from 'react-router-dom';

import { Button } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18Context';
import { createSimpleWallet, WalletType } from '@renderer/domain/wallet';
import { useWallet } from '@renderer/services/wallet/walletService';

const Onboarding = () => {
  const { onLocaleChange } = useI18n();
  const { addWallet } = useWallet();

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
