// import { Outlet } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';
import { createSimpleWallet, WalletType } from '@renderer/domain/wallet';
import { useWallet } from '@renderer/services/wallet/walletService';
// import { Button } from '@renderer/components/ui';
import FallbackScreen from '@renderer/components/common/FallbackScreen/FallbackScreen';

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

  return <FallbackScreen />;
};

export default Onboarding;
