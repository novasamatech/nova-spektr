import { t } from 'i18next';

import { TEST_IDS } from '@/shared/constants';
import { type SignableWalletFamily, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';

const WalletIcon: Record<SignableWalletFamily, IconNames> = {
  [WalletType.POLKADOT_VAULT]: 'vault',
  [WalletType.POLKADOT_EXTENSION]: 'polkadotExtension',
  [WalletType.TALISMAN_EXTENSION]: 'talismanExtension',
  [WalletType.SUBWALLET_EXTENSION]: 'subwalletExtension',
  [WalletType.WALLET_CONNECT]: 'walletConnect',
  [WalletType.NOVA_WALLET]: 'novaWallet',
  [WalletType.SINGLE_PARITY_SIGNER]: 'vault',
};

const WalletText: Record<SignableWalletFamily, string> = {
  [WalletType.POLKADOT_VAULT]: t('operation.sign.polkadotVault'),
  [WalletType.POLKADOT_EXTENSION]: t('operation.sign.polkadotExtension'),
  [WalletType.TALISMAN_EXTENSION]: t('operation.sign.talismanExtension'),
  [WalletType.SUBWALLET_EXTENSION]: t('operation.sign.subWalletExtension'),
  [WalletType.WALLET_CONNECT]: t('operation.sign.walletConnect'),
  [WalletType.NOVA_WALLET]: t('operation.sign.novaWallet'),
  [WalletType.SINGLE_PARITY_SIGNER]: t('operation.sign.polkadotVault'),
};

const DefaultSignButton = 'operation.sign.default';

type Props = {
  type?: WalletType; // TODO: should not be undefined
  isDefault?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
};

export const SignButton = ({ disabled, isDefault, isLoading, type, className, onClick }: Props) => {
  const { t } = useI18n();

  return (
    <Button
      className={className}
      testId={TEST_IDS.OPERATIONS.SIGN_BUTTON}
      disabled={disabled}
      isLoading={isLoading}
      prefixElement={
        type && <Icon className="text-icon-button" name={WalletIcon[type as SignableWalletFamily]} size={14} />
      }
      onClick={onClick}
    >
      {t(type && !isDefault ? WalletText[type as SignableWalletFamily] : DefaultSignButton)}
    </Button>
  );
};
