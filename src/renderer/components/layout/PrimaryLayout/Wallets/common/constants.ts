import { ButtonDropdownOption } from '@renderer/components/ui-redesign/Dropdowns/DropdownButton/DropdownButton';
import Paths from '@renderer/routes/paths';
import { WalletType } from '@renderer/domain/shared-kernel';
import { IconNames } from '@renderer/components/ui/Icon/data';

export const AddWalletOptions: ButtonDropdownOption[] = [
  { id: 'vault', title: 'wallets.addPolkadotVault', to: Paths.PARITY, iconName: 'vault' },
  { id: 'watch-only', title: 'wallets.addWatchOnly', to: Paths.WATCH_ONLY, iconName: 'watchOnly' },
  { id: 'multi', title: 'wallets.addMultisig', to: Paths.CREATE_MULTISIG_ACCOUNT, iconName: 'multisig' },
];

export const GroupLabels: Record<WalletType, string> = {
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'wallets.multishardLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.SINGLE_PARITY_SIGNER]: 'wallets.paritySignerLabel',
};

export const GroupIcons: Record<WalletType, IconNames> = {
  [WalletType.MULTISIG]: 'multisig',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'multishard',
  [WalletType.WATCH_ONLY]: 'watchOnly',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
};
