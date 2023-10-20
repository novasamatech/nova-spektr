import { useI18n } from '@renderer/app/providers';
import { WalletType } from '@renderer/shared/core';
import { Button, Icon } from '@renderer/shared/ui';
import { IconNames } from '@renderer/shared/ui/Icon/data';

type Props = {
  type: WalletType;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

const WalletIcon: Record<WalletType, IconNames> = {
  [WalletType.POLKADOT_VAULT]: 'vault',
  [WalletType.MULTISIG]: 'vault',
  [WalletType.WATCH_ONLY]: 'watchOnlyOld',
  [WalletType.WALLET_CONNECT]: 'walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWalletOld',
  // legacy
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'vault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
};

const WalletText: Record<WalletType, string> = {
  [WalletType.POLKADOT_VAULT]: 'operation.polkadotVault',
  [WalletType.MULTISIG]: 'operation.polkadotVault',
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
