import { WalletType } from '@renderer/shared/core';
import { IconNames } from '@renderer/shared/ui/Icon/data';

export const WalletIconNames: Record<`${WalletType}`, IconNames> = {
  [WalletType.SINGLE_PARITY_SIGNER]: 'vaultNew',
  [WalletType.WATCH_ONLY]: 'watchOnlyNew',
  [WalletType.MULTISIG]: 'multisigNew',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'multishard',
  // [WalletType.WALLET_CONNECT]: 'walletConnectNew',
};

export const WalletIconBg: Record<`${WalletType}`, string> = {
  [WalletType.SINGLE_PARITY_SIGNER]: 'bg-[#EC007D]',
  [WalletType.WATCH_ONLY]: 'bg-[linear-gradient(222deg,_#FFC700_13.44%,_#FF2E00_87.12%)]',
  [WalletType.MULTISIG]: 'bg-[linear-gradient(223deg,_#D4FF59_-17.82%,_#00AF9A_55.03%,_#1AB775_100.43%)]',
  [WalletType.MULTISHARD_PARITY_SIGNER]: '',
  // [WalletType.WALLET_CONNECT]: 'bg-[#EC007D]',
};
