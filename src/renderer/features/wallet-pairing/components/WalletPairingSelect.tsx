import { type TFunction } from 'i18next';

import { TEST_IDS } from '@/shared/constants';
import { createSlot, useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, Icon } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';

export const walletPairingDropdownOptionsSlot = createSlot<{ t: TFunction }>();

export const WalletPairingSelect = () => {
  const { t } = useI18n();

  const [isOpen, toggleIsOpen] = useToggle();
  const dropdownOptions = useSlot(walletPairingDropdownOptionsSlot, { props: { t } });

  return (
    <Dropdown open={isOpen} keepOpen onToggle={toggleIsOpen}>
      <Dropdown.Trigger>
        <Button
          className="h-8.5 w-[143px] justify-center py-2"
          suffixElement={<Icon name={isOpen ? 'up' : 'down'} size={16} className="text-inherit" />}
          testId={TEST_IDS.ADD_BUTTON}
        >
          {t('wallets.addButtonTitle')}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content>{dropdownOptions}</Dropdown.Content>
    </Dropdown>
  );
};
