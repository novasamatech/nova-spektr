import { Popover } from '@headlessui/react';
import { useUnit } from 'effector-react';
import { ReactNode, useEffect } from 'react';

import { walletSelectModel } from '../model/wallet-select-model';
import { SmallTitleText, SearchInput } from '@shared/ui';
import { WalletFamily } from '@shared/core';
import { useI18n } from '@app/providers';
import { WalletGroup } from './WalletGroup';

type Props = {
  action?: ReactNode;
  onClose: () => void;
};
export const WalletPanel = ({ action, onClose }: Props) => {
  const { t } = useI18n();

  const filteredWalletGroups = useUnit(walletSelectModel.$filteredWalletGroups);
  const isWalletChanged = useUnit(walletSelectModel.$isWalletChanged);

  useEffect(() => {
    if (!isWalletChanged) return;

    onClose();
  }, [isWalletChanged]);

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
            if (wallets.length === 0) return null;

            return <WalletGroup key={walletType} type={walletType as WalletFamily} wallets={wallets} />;
          })}
        </div>
      </section>
    </Popover.Panel>
  );
};
