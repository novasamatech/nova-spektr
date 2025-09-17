import { useGate } from 'effector-react';
import { useState } from 'react';

import { type XOR } from '@/shared/core/types/utility';
import { combineIdentifiers } from '@/shared/di';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { Icon, IconButton, type IconNames } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';
import { permissionUtils, walletUtils } from '@/entities/wallet';
import { walletActionsSlot as extensionActionsSlot } from '@/features/extension-wallet';
import { ChangeSignatories } from '@/features/flexible-change-signatories';
import { walletActionsSlot as multisigActionsSlot } from '@/features/multisig-wallet';
import { walletActionsSlot as polkadotVaultActionsSlot } from '@/features/polkadot-vault-wallet';
import { AddPureProxied } from '@/features/proxied-add-pure';
import { walletActionsSlot as proxiedActionsSlot } from '@/features/proxied-wallet';
import { AddProxy } from '@/features/proxy-add';
import { walletActionsSlot as walletConnectActionsSlot } from '@/features/wallet-connect-wallet';
import { ExportKeysModal } from '@/features/wallets/ExportKeys';
import { ForgetWalletConfirm } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { walletActionsSlot as watchOnlyActionsSlot } from '@/features/watch-only-wallet';

export { walletDetailsUtils } from './lib/utils';

import { walletConnectForget } from './model/walletConnectForgot';
import { WalletDetails } from './ui/components';

export { overviewSlot as simpleOverviewSlot } from './ui/wallets/SimpleWalletDetails';
export { overviewSlot as vaultOverviewSlot } from './ui/wallets/VaultWalletDetails';
export { overviewSlot as multisigOverviewSlot } from './ui/wallets/MultisigWalletDetails';
export { overviewSlot as proxiedOverviewSlot } from './ui/wallets/ProxiedWalletDetails';
export { overviewSlot as walletConnectOverviewSlot } from './ui/wallets/WalletConnectDetails';
export { overviewSlot as watchOnlyOverviewSlot } from './ui/wallets/WatchOnlyWalletDetails';
export { overviewSlot as flexibleOverviewSlot } from './ui/wallets/FlexibleWalletDetails';

export { WalletDetails };

/**
 * The reason for the existence of this feature is WalletDetails component
 * implementation. walletDetailsFeature should be obsolete and details for each
 * type of wallet should be coupled with wallet implementation.
 */

export const walletDetailsFeature = createFeature({
  name: 'wallet/details',
});

const walletActionSlot = combineIdentifiers(
  walletConnectActionsSlot,
  watchOnlyActionsSlot,
  polkadotVaultActionsSlot,
  proxiedActionsSlot,
  multisigActionsSlot,
  extensionActionsSlot,
);

type DropdownItemProps = XOR<
  {
    icon: IconNames;
    title: string;
    onClick: () => void;
  },
  {
    component: React.ReactNode;
  }
>;

const DropdownItem = (props: DropdownItemProps) => {
  if ('component' in props) {
    return props.component;
  }

  return (
    <Dropdown.Item onClick={props.onClick}>
      <div className="flex items-center gap-2">
        <Icon name={props.icon} size={20} className="text-icon-accent" />
        {props.title}
      </div>
    </Dropdown.Item>
  );
};

walletDetailsFeature.inject(walletActionSlot, ({ wallet }) => {
  useGate(walletConnectForget.flow, { accounts: wallet.accounts });
  const [isWalletDetailsOpen, setIsWalletDetailsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { t } = useI18n();

  const createModalCloseHandler = (modalCloseFn?: () => void) => () => {
    modalCloseFn?.();
    setIsDropdownOpen(false);
  };

  const items: DropdownItemProps[] = [
    {
      icon: 'info',
      title: t('walletDetails.common.viewDetails'),
      onClick: () => setIsWalletDetailsOpen(true),
    },
    {
      component: (
        <RenameWalletModal wallet={wallet} onClose={createModalCloseHandler()}>
          <Dropdown.Item>
            <div className="flex items-center gap-2">
              <Icon name="renameUnderline" size={20} className="text-icon-accent" />
              {t('walletDetails.common.renameButton')}
            </div>
          </Dropdown.Item>
        </RenameWalletModal>
      ),
    },
  ];

  if (!walletUtils.isProxied(wallet) && !walletUtils.isFlexibleMultisig(wallet)) {
    let icon: IconNames = 'forget';
    let title = t('walletDetails.common.forgetButton');

    if (walletUtils.isRegularMultisig(wallet)) {
      icon = 'eyeSlashed';
      title = t('walletDetails.common.hideButton');
    }

    let onForget;
    if (walletUtils.isWalletConnectGroup(wallet)) {
      onForget = () => {
        walletConnectForget.forget(wallet);
      };
    }

    items.push({
      component: (
        <ForgetWalletConfirm wallet={wallet} onClose={createModalCloseHandler()} onForget={onForget}>
          <Dropdown.Item>
            <div className="flex items-center gap-2">
              <Icon name={icon} size={20} className="text-icon-accent" />
              {title}
            </div>
          </Dropdown.Item>
        </ForgetWalletConfirm>
      ),
    });
  }

  if (walletUtils.isFlexibleMultisig(wallet)) {
    items.push({
      component: (
        <ChangeSignatories wallet={wallet} onClose={createModalCloseHandler()}>
          <Dropdown.Item>
            <div className="flex items-center gap-2">
              <Icon name="changeSignatories" size={20} className="text-icon-accent" />
              {t('walletDetails.multisig.changeSignatories')}
            </div>
          </Dropdown.Item>
        </ChangeSignatories>
      ),
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
    items.push({
      component: (
        <AddProxy wallet={wallet} onClose={createModalCloseHandler()}>
          <Dropdown.Item>
            <div className="flex items-center gap-2">
              <Icon name="delegate" size={20} className="text-icon-accent" />
              {t('walletDetails.common.addProxyAction')}
            </div>
          </Dropdown.Item>
        </AddProxy>
      ),
    });
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    items.push({
      component: (
        <ExportKeysModal wallet={wallet} onClose={createModalCloseHandler()}>
          <Dropdown.Item>
            <div className="flex items-center gap-2">
              <Icon name="export" size={20} className="text-icon-accent" />
              {t('walletDetails.vault.export')}
            </div>
          </Dropdown.Item>
        </ExportKeysModal>
      ),
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
    items.push({
      component: (
        <AddPureProxied wallet={wallet} onClose={createModalCloseHandler()}>
          <Dropdown.Item>
            <div className="flex items-center gap-2">
              <Icon name="createPureProxy" size={20} className="text-icon-accent" />
              {t('walletDetails.common.addPureProxiedAction')}
            </div>
          </Dropdown.Item>
        </AddPureProxied>
      ),
    });
  }

  return (
    <>
      <Dropdown keepOpen avoidCollisions open={isDropdownOpen} onToggle={setIsDropdownOpen}>
        <Dropdown.Trigger>
          <IconButton name="more" />
        </Dropdown.Trigger>
        <Dropdown.Content>
          {items.map((item, index) => (
            <DropdownItem key={item.title || `item-${index}`} {...item} />
          ))}
        </Dropdown.Content>
      </Dropdown>

      <WalletDetails
        wallet={wallet}
        isOpen={isWalletDetailsOpen}
        onClose={createModalCloseHandler(() => setIsWalletDetailsOpen(false))}
      />
    </>
  );
});
