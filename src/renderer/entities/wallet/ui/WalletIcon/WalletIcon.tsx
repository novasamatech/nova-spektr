import { WalletType } from '@shared/core';
import { Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { IconNames } from '@shared/ui/Icon/data';

const WalletIconNames: Record<WalletType, IconNames> = {
  [WalletType.POLKADOT_VAULT]: 'vault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
  [WalletType.WATCH_ONLY]: 'watchOnly',
  [WalletType.MULTISIG]: 'multisig',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'vault',
  [WalletType.WALLET_CONNECT]: 'walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWallet',
};

const WalletIconBg: Record<WalletType, string> = {
  [WalletType.POLKADOT_VAULT]: 'bg-[#EC007D]',
  [WalletType.SINGLE_PARITY_SIGNER]: 'bg-[#EC007D]',
  [WalletType.WATCH_ONLY]: 'bg-[linear-gradient(222deg,_#FFC700_13.44%,_#FF2E00_87.12%)]',
  [WalletType.MULTISIG]: 'bg-[linear-gradient(223deg,_#D4FF59_-17.82%,_#00AF9A_55.03%,_#1AB775_100.43%)]',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'bg-[#EC007D]',
  [WalletType.WALLET_CONNECT]: 'bg-[#3396FF]',
  [WalletType.NOVA_WALLET]: '',
};

type Props = {
  type: WalletType;
  className?: string;
  size?: number;
};

export const WalletIcon = ({ type, size = 20, className }: Props) => {
  return (
    <Icon
      name={WalletIconNames[type]}
      size={size}
      className={cnTw('rounded-full text-white', WalletIconBg[type], className)}
    />
  );
};
