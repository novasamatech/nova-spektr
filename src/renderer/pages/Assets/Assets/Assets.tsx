import { useUnit } from 'effector-react';
import { Suspense, lazy } from 'react';
import { Outlet } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { Header, Loader } from '@/shared/ui';
import { AssetsListView } from '@/entities/asset';
import { AssetsSearch, AssetsSettings, assetsSearchModel, assetsSettingsModel } from '@/features/assets';
import { AssetTransactionModal } from '@/features/assets-transaction';
import { ShardSelectorButton, ShardSelectorModal } from '@/features/wallets';

const AssetsPortfolioView = lazy(() =>
  import('@/features/assets').then(({ AssetsPortfolioView }) => ({ default: AssetsPortfolioView })),
);
const AssetsChainView = lazy(() =>
  import('@/features/assets').then(({ AssetsChainView }) => ({ default: AssetsChainView })),
);

import { assetsModel } from './model/assets-model';

export const Assets = () => {
  const { t } = useI18n();

  const assetsView = useUnit(assetsSettingsModel.$assetsView);
  const visibleAccounts = useUnit(assetsModel.$visibleAccounts);
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
          {assetsView === AssetsListView.TOKEN_CENTRIC && (
            <Suspense fallback={<Loader color="primary" className="m-auto" />}>
              <AssetsPortfolioView />
            </Suspense>
          )}
          {assetsView === AssetsListView.CHAIN_CENTRIC && (
            <Suspense fallback={<Loader color="primary" className="m-auto" />}>
              <AssetsChainView query={query} visibleAccounts={visibleAccounts} hideZeroBalances={hideZeroBalances} />
            </Suspense>
          )}
        </div>
      </section>

      <AssetTransactionModal />
      <ShardSelectorModal onConfirm={assetsModel.setVisibleAccounts} />
      <Outlet />
    </>
  );
};
