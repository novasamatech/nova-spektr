import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import {
  AssetsChainView,
  AssetsPortfolioView,
  AssetsSearch,
  AssetsSettings,
  assetsSearchModel,
  assetsSettingsModel,
} from '@/features/assets';
import { AssetTransactionModal } from '@/features/assets-transaction';
import { ShardSelectorButton, ShardSelectorModal } from '@/features/wallets';

import { assetsModel } from './model/assets-model';

export const Assets = () => {
  const { t } = useI18n();

  const assetsView = useUnit(assetsSettingsModel.$assetsView);
  const selectedAccounts = useUnit(assetsModel.$selectedAccounts);
  const query = useUnit(assetsSearchModel.$query);
  const hideZeroBalances = useUnit(assetsSettingsModel.$hideZeroBalances);

  return (
    <>
      <section className="flex h-full flex-col">
        <Header title={t('balances.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <div className="grid grid-cols-[230px_1fr] items-center gap-x-3">
            <AssetsSearch />
            <AssetsSettings />
          </div>
        </Header>
        <ShardSelectorButton />
        <div className="flex h-full w-full flex-col gap-y-4 overflow-y-scroll">
          <AssetsPortfolioView />
          <AssetsChainView
            query={query}
            selectedAccounts={selectedAccounts}
            hideZeroBalances={hideZeroBalances}
            assetsView={assetsView}
          />
        </div>
      </section>

      <AssetTransactionModal />
      <ShardSelectorModal onConfirm={assetsModel.setSelectedAccounts} />
      <Outlet />
    </>
  );
};
