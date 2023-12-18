import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { AssetsFilters, AssetsList } from './components';
import { Header } from '@renderer/components/common';
import { priceProviderModel } from '@entities/price';
import { ShardSelectorModal, ShardSelectorButton } from '@features/wallets';
import { assetsModel } from './model/assets-model';

export const Assets = () => {
  const { t } = useI18n();

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  return (
    <>
      <section className="h-full flex flex-col">
        <Header title={t('balances.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <AssetsFilters />
        </Header>
        <ShardSelectorButton />
        <AssetsList />
      </section>

      <ShardSelectorModal onConfirm={assetsModel.events.activeShardsSet} />
      <Outlet />
    </>
  );
};
