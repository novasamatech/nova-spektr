import { type ReactNode } from 'react';

import { useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, Icon } from '@/shared/ui';
import { Dropdown, Tooltip } from '@/shared/ui-kit';

import { walletPairingDropdownOptionsSlot } from './WalletPairingSelect';

type Props = {
  tooltipContent?: ReactNode | null;
};

export const WalletPairingOperationTrigger = ({ tooltipContent }: Props) => {
  const { t } = useI18n();
  const [isOpen, toggleIsOpen] = useToggle();
  const dropdownOptions = useSlot(walletPairingDropdownOptionsSlot, { props: { t } });

  const triggerBlock = (
    <div>
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
    </div>
  );

  if (tooltipContent === null) {
    return triggerBlock;
  }

  const resolvedTooltip = tooltipContent ?? t('operation.addWalletTooltip');

  return (
    <Tooltip open={isOpen ? false : undefined}>
      <Tooltip.Trigger>{triggerBlock}</Tooltip.Trigger>
      <Tooltip.Content>{resolvedTooltip}</Tooltip.Content>
    </Tooltip>
  );
};
