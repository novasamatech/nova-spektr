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
    <Popover.Panel className="absolute mt-2 z-10 rounded-md bg-token-container-background border border-token-container-border shadow-card-shadow overflow-hidden">
      <section className="relative max-h-[700px] w-[300px] bg-card-background flex flex-col">
        <header className="px-5 py-3 flex items-center justify-between border-b border-divider">
          <SmallTitleText>{t('wallets.title')}</SmallTitleText>
          {action}
        </header>

        <div className="p-2 border-b border-divider">
          <SearchInput placeholder={t('wallets.searchPlaceholder')} onChange={walletSelectModel.events.queryChanged} />
        </div>

        <div className="flex flex-col divide-y divide-divider overflow-y-auto max-h-[530px] px-1">
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
