import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { Dropdown } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';
import { walletPairingDropdownOptionsSlot, walletPairingModel } from '@/features/wallet-pairing';

export const walletPairingMultisigFeature = createFeature({
  name: 'wallet pairing/multisig',
});

walletPairingMultisigFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 1,
  render({ t }) {
    return (
      <Dropdown.Item onSelect={() => walletPairingModel.events.walletTypeSet(WalletType.MULTISIG)}>
        <WalletIcon type={WalletType.MULTISIG} />
        {t('wallets.addMultisig')}
      </Dropdown.Item>
    );
  },
});
