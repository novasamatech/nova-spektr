import { Outlet } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { ShardSelectorButton, ShardSelectorModal } from '@features/wallets';
import { AssetsChainView } from '@features/assets';
import { AssetsFilters } from './components';
import { assetsViewModel } from './model/assets-view-model';

export const Assets = () => {
  const { t } = useI18n();

  return (
    <>
      <section className="h-full flex flex-col">
        <Header title={t('balances.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <AssetsFilters />
        </Header>
        <ShardSelectorButton />

        <AssetsChainView />
      </section>

      <ShardSelectorModal onConfirm={assetsViewModel.events.activeShardsSet} />
      <Outlet />
    </>
  );
};
