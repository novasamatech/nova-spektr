import { Outlet } from 'react-router-dom';
import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { ShardSelectorButton, ShardSelectorModal } from '@features/wallets';
import {
  AssetsChainView,
  AssetsPortfolio,
  AssetsSearch,
  AssetsSettings,
  assetsSearchModel,
  assetsSettingsModel,
  portfolioModel,
} from '@features/assets';
import { AssetsListView } from '@entities/asset';
import { assetsModel } from './model/assets-model';

export const Assets = () => {
  const { t } = useI18n();

  const activeShards = useUnit(assetsModel.$activeShards);
  const query = useUnit(assetsSearchModel.$query);
  const hideZeroBalances = useUnit(assetsSettingsModel.$hideZeroBalances);
  const assetsView = useUnit(assetsSettingsModel.$assetsView);

  useEffect(() => {
    portfolioModel.events.setActiveView(assetsView);
  }, [assetsView]);

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
          {activeShards.length > 0 &&
            (assetsView === AssetsListView.CHAIN_CENTRIC ? (
              <AssetsChainView query={query} activeShards={activeShards} hideZeroBalances={hideZeroBalances} />
            ) : (
              <AssetsPortfolio />
            ))}
        </div>
      </section>

      <ShardSelectorModal onConfirm={assetsModel.events.activeShardsSet} />
      <Outlet />
    </>
  );
};
