import { useI18n } from '@app/providers';
import { SignableWalletFamily, WalletType } from '@shared/core';
import { Button, Icon } from '@shared/ui';
import { IconNames } from '@shared/ui/Icon/data';

const WalletIcon: Record<SignableWalletFamily, IconNames> = {
  [WalletType.POLKADOT_VAULT]: 'vault',
  [WalletType.WALLET_CONNECT]: 'walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWallet',
  // legacy
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'vault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
};

const WalletText: Record<SignableWalletFamily, string> = {
  [WalletType.POLKADOT_VAULT]: 'operation.sign.polkadotVault',
  [WalletType.WALLET_CONNECT]: 'operation.sign.walletConnect',
  [WalletType.NOVA_WALLET]: 'operation.sign.novaWallet',
  // legacy
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'operation.sign.polkadotVault',
  [WalletType.SINGLE_PARITY_SIGNER]: 'operation.sign.polkadotVault',
};

const DefaultSignButton = 'operation.sign.default';

type Props = {
  type?: WalletType; // TODO: should not be undefined
  isDefault?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

export const SignButton = ({ disabled, isDefault, type, className, onClick }: Props) => {
  const { t } = useI18n();

  return (
    <Button
      className={className}
      disabled={disabled}
      prefixElement={
        type && <Icon className="text-icon-button" name={WalletIcon[type as SignableWalletFamily]} size={14} />
      }
      onClick={onClick}
    >
      {t(type && !isDefault ? WalletText[type as SignableWalletFamily] : DefaultSignButton)}
    </Button>
  );
};
