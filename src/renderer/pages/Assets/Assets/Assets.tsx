import { Outlet } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { Header } from '@renderer/components/common';
import { ShardSelectorModal, ShardSelectorButton } from '@features/wallets';
import { assetsModel } from './model/assets-model';
import { AssetsFilters, AssetsList } from './components';

export const Assets = () => {
  const { t } = useI18n();

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
