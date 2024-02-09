import { useI18n } from '@app/providers';
import { SignableWalletFamily, WalletType } from '@shared/core';
import { Button, Icon } from '@shared/ui';
import { IconNames } from '@shared/ui/Icon/data';

type Props = {
  type?: WalletType;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

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

const UnkownWalletText = 'operation.sign.unknown';

export const SignButton = ({ disabled, type, onClick, className }: Props) => {
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
      {t(type ? WalletText[type as SignableWalletFamily] : UnkownWalletText)}
    </Button>
  );
};
