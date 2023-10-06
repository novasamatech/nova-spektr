import { useI18n } from '@renderer/app/providers';
import { WalletType } from '@renderer/domain/shared-kernel';
import { Button, Icon } from '@renderer/shared/ui';
import { IconNames } from '@renderer/shared/ui/Icon/data';

type Props = {
  type: WalletType;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

const WalletIcon: Record<WalletType, IconNames | undefined> = {
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'vault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
  [WalletType.MULTISIG]: 'vault',
  [WalletType.WATCH_ONLY]: undefined,
  [WalletType.WALLET_CONNECT]: 'walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWallet',
};

const WalletText: Record<WalletType, string> = {
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'operation.sign.polkadotVault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'operation.sign.polkadotVault',
  [WalletType.MULTISIG]: 'operation.polkadotVault',
  [WalletType.WATCH_ONLY]: '',
  [WalletType.WALLET_CONNECT]: 'operation.sign.walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWallet.sign.novaWallet',
};

export const SignButton = ({ disabled, type, onClick, className }: Props) => {
  const { t } = useI18n();

  const icon = WalletIcon[type];

  return (
    <Button
      className={className}
      disabled={disabled}
      prefixElement={icon && <Icon name={icon} size={14} />}
      onClick={onClick}
    >
      {t(WalletText[type])}
    </Button>
  );
};
