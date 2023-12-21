import { useI18n } from '@app/providers';
import { WalletType } from '@shared/core';
import { Button, Icon } from '@shared/ui';
import { IconNames } from '@shared/ui/Icon/data';

type Props = {
  type: WalletType;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

const WalletIcon: Record<WalletType, IconNames> = {
  [WalletType.POLKADOT_VAULT]: 'vault',
  [WalletType.MULTISIG]: 'vault',
  [WalletType.WATCH_ONLY]: 'watchOnly',
  [WalletType.WALLET_CONNECT]: 'walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWallet',
  // legacy
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'vault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
};

const WalletText: Record<WalletType, string> = {
  [WalletType.POLKADOT_VAULT]: 'operation.sign.polkadotVault',
  [WalletType.MULTISIG]: 'operation.sign.polkadotVault',
  [WalletType.WATCH_ONLY]: 'operation.sign.watchOnly',
  [WalletType.WALLET_CONNECT]: 'operation.sign.walletConnect',
  [WalletType.NOVA_WALLET]: 'operation.sign.novaWallet',
  // legacy
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'operation.sign.polkadotVault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'operation.sign.polkadotVault',
};

export const SignButton = ({ disabled, type, onClick, className }: Props) => {
  const { t } = useI18n();

  return (
    <Button
      className={className}
      disabled={disabled}
      prefixElement={<Icon className="text-icon-button" name={WalletIcon[type]} size={14} />}
      onClick={onClick}
    >
      {t(WalletText[type])}
    </Button>
  );
};
