import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { walletPairingDropdownOptionsPipeline } from '@/features/wallet-pairing';

export const walletPairingMultisigFeature = createFeature({
  name: 'wallet pairing/multisig',
});

walletPairingMultisigFeature.inject(walletPairingDropdownOptionsPipeline, (options, { t }) => {
  return options.concat({ title: t('wallets.addMultisig'), walletType: WalletType.MULTISIG, order: 1 });
});
