import { Popover } from '@headlessui/react';
import { useUnit } from 'effector-react';
import { type ReactNode, useEffect } from 'react';

import { useI18n } from '@app/providers';
import { type WalletFamily } from '@shared/core';
import { SearchInput, SmallTitleText } from '@shared/ui';
import { type Callbacks, walletSelectModel } from '../model/wallet-select-model';

import { WalletGroup } from './WalletGroup';

type Props = Callbacks & {
  action?: ReactNode;
};
export const WalletPanel = ({ action, onClose }: Props) => {
  const { t } = useI18n();

  const filteredWalletGroups = useUnit(walletSelectModel.$filteredWalletGroups);

  useEffect(() => {
    walletSelectModel.events.callbacksChanged({ onClose });
  }, [onClose]);

  return (
    <Popover.Panel className="absolute z-10 mt-2 overflow-hidden rounded-md border border-token-container-border bg-token-container-background shadow-card-shadow">
      <section className="relative flex max-h-[700px] w-[300px] flex-col bg-card-background">
        <header className="flex items-center justify-between border-b border-divider px-5 py-3">
          <SmallTitleText>{t('wallets.title')}</SmallTitleText>
          {action}
        </header>

        <div className="border-b border-divider p-2">
          <SearchInput placeholder={t('wallets.searchPlaceholder')} onChange={walletSelectModel.events.queryChanged} />
        </div>

        <div className="flex max-h-[530px] flex-col divide-y divide-divider overflow-y-auto px-1">
          {Object.entries(filteredWalletGroups).map(([walletType, wallets]) => {
            if (wallets.length === 0) {
              return null;
            }

            return <WalletGroup key={walletType} type={walletType as WalletFamily} wallets={wallets} />;
          })}
        </div>
      </section>
    </Popover.Panel>
  );
};
