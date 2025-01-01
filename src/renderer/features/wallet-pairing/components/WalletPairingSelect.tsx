import { type TFunction } from 'i18next';

import { type WalletFamily } from '@/shared/core';
import { createPipeline, usePipeline } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, Icon } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';
import { walletPairingModel } from '../model/wallet-pairing-model';

/**
 * TODO feature shouldn't know wallet type,
 * `walletPairingModel.events.walletTypeSet(walletType)` should be replaced with
 * internal flow implementation.
 */
export const walletPairingDropdownOptionsPipeline = createPipeline<
  { title: string; walletType: WalletFamily; order: number }[],
  { t: TFunction }
>({
  postprocess: options => options.sort((a, b) => a.order - b.order),
});

export const WalletPairingSelect = () => {
  const { t } = useI18n();

  const [isOpen, toggleIsOpen] = useToggle();
  const dropdownOptions = usePipeline(walletPairingDropdownOptionsPipeline, [], { t });

  return (
    <Dropdown open={isOpen} onToggle={toggleIsOpen}>
      <Dropdown.Trigger>
        <Button
          className="h-8.5 w-full justify-center py-2"
          suffixElement={<Icon name={isOpen ? 'up' : 'down'} size={16} className="text-inherit" />}
        >
          {t('wallets.addButtonTitle')}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        {dropdownOptions.map(({ title, walletType }) => (
          <Dropdown.Item key={title} onSelect={() => walletPairingModel.events.walletTypeSet(walletType)}>
            <div className="flex items-center gap-2">
              <WalletIcon type={walletType} />
              {title}
            </div>
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
};
