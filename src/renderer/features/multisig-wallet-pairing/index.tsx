import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { Dropdown } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';
import { walletPairingDropdownOptionsSlot, walletPairingModel } from '@/features/wallet-pairing';

import { SelectMultisigWalletType } from './components/SelectMultisigWalletType';

/**
 * Multisig pairing feature is not implemented yet, so it's basically an ad on
 * onboarding page.
 */

export const multisigWalletPairingFeature = createFeature({
  name: 'multisig/wallet pairing',
  enable: $features.map(f => f.multisig),
});

multisigWalletPairingFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 1,
  render({ t }) {
    return (
      <SelectMultisigWalletType>
        <Dropdown.Item onSelect={() => walletPairingModel.events.walletTypeSet(WalletType.MULTISIG)}>
          <WalletIcon type={WalletType.MULTISIG} />
          {t('wallets.addMultisig')}
        </Dropdown.Item>
      </SelectMultisigWalletType>
    );
  },
});
