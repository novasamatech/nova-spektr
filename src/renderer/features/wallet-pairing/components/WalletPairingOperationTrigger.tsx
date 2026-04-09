import { useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, Icon } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';

import { walletPairingDropdownOptionsSlot } from './WalletPairingSelect';

/**
 * Compact variant of the wallet-pairing dropdown, styled to live inside a
 * multisig operation row's action column. Matches the sizing + semi-opaque
 * background treatment of the neighboring Reject / Approve buttons (`size="sm"`
 * pill, accent-tinted fill) rather than the larger sidebar "Add" button.
 *
 * Renders the same underlying `walletPairingDropdownOptionsSlot` content as
 * `WalletPairingSelect`, so every wallet-pairing sub-feature (Polkadot Vault,
 * Nova Wallet, WalletConnect, Multisig, Watch-only, etc.) shows up here with no
 * per-trigger injection.
 */
export const WalletPairingOperationTrigger = () => {
  const { t } = useI18n();
  const [isOpen, toggleIsOpen] = useToggle();
  const dropdownOptions = useSlot(walletPairingDropdownOptionsSlot, { props: { t } });

  return (
    <Dropdown open={isOpen} keepOpen onToggle={toggleIsOpen}>
      <Dropdown.Trigger>
        <Button
          size="sm"
          className="flex-1 justify-center border-0 bg-badge-background text-tab-text-accent hover:bg-badge-background-hover"
          suffixElement={<Icon name={isOpen ? 'up' : 'down'} size={14} className="text-inherit" />}
        >
          {t('operation.addWalletButton')}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content>{dropdownOptions}</Dropdown.Content>
    </Dropdown>
  );
};
