import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { useI18n } from '@app/providers';

import { Header } from '@shared/ui';

import {
  AssetsChainView,
  AssetsPortfolioView,
  AssetsSearch,
  AssetsSettings,
  assetsSearchModel,
  assetsSettingsModel,
} from '@features/assets';
import { ShardSelectorButton, ShardSelectorModal } from '@features/wallets';

import { AssetTransactionModal } from '@widgets/AssetTransactionModal';

import { assetsModel } from './model/assets-model';

export const Assets = () => {
  const { t } = useI18n();

  const assetsView = useUnit(assetsSettingsModel.$assetsView);
  const activeShards = useUnit(assetsModel.$activeShards);
  const query = useUnit(assetsSearchModel.$query);
  const hideZeroBalances = useUnit(assetsSettingsModel.$hideZeroBalances);

  return (
    <>
      <section className="h-full flex flex-col">
        <Header title={t('balances.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <div className="flex items-center gap-x-3">
            <AssetsSearch />
            <AssetsSettings />
          </div>
        </Header>
        <ShardSelectorButton />
        <div className="flex flex-col gap-y-4 w-full h-full overflow-y-scroll">
          <AssetsPortfolioView />
          <AssetsChainView
            query={query}
            activeShards={activeShards}
            hideZeroBalances={hideZeroBalances}
            assetsView={assetsView}
          />
        </div>
      </section>

      <AssetTransactionModal />
      <ShardSelectorModal onConfirm={assetsModel.events.activeShardsSet} />
      <Outlet />
    </>
  );
};
