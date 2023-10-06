import { Disclosure } from '@headlessui/react';
import cn from 'classnames';

import { Icon, BodyText, CaptionText } from '@renderer/shared/ui';
import { GroupIcons, GroupLabels } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { useI18n } from '@renderer/app/providers';
import { cnTw } from '@renderer/shared/lib/utils';
import { WalletType, Wallet } from '@renderer/shared/core';

type Props = {
  type: WalletType;
  wallets: Wallet[];
  onSelect: (wallet: Wallet['id']) => void;
};

export const WalletGroup = ({ type, wallets, onSelect }: Props) => {
  const { t } = useI18n();

  return (
    <li>
      <Disclosure defaultOpen>
        <Disclosure.Button className="w-full flex justify-between items-center py-3.5 px-5">
          {({ open }) => (
            <>
              <div className="flex items-center justify-between gap-x-1.5">
                <Icon size={14} name={GroupIcons[type]} className="text-chip-icon" />
                <CaptionText className="text-chip-text uppercase">{t(GroupLabels[type])}</CaptionText>
                <CaptionText className="bg-chip-icon text-white px-1.5 py-0.5 h-4 rounded-full" align="center">
                  {wallets.length}
                </CaptionText>
              </div>

              <Icon name="down" size={16} className={cnTw(open && 'rotate-180')} />
            </>
          )}
        </Disclosure.Button>

        <Disclosure.Panel as="ul" className="flex flex-col gap-y-1 px-1 py-2">
          {wallets.map((wallet, index) => (
            <li
              key={wallet.id}
              className={cn('hover:bg-action-background-hover rounded', wallet.isActive && 'bg-selected-background')}
            >
              <button className="w-full py-1.5 px-4 flex flex-col" onClick={() => onSelect(wallet.id)}>
                <BodyText className="text-text-secondary max-w-[260px] truncate">{wallet.name}</BodyText>
              </button>
            </li>
          ))}
        </Disclosure.Panel>
      </Disclosure>
    </li>
  );
};
