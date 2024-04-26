import { Outlet } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { ShardSelectorButton, ShardSelectorModal } from '@features/wallets';
import {
  AssetsChainView,
  AssetsSearch,
  AssetsSettings,
  assetsSearchModel,
  assetsSettingsModel,
} from '@features/assets';
import { assetsModel } from './model/assets-model';

export const Assets = () => {
  const { t } = useI18n();

  const title = useUnit(assetsModel.$title);
  const activeShards = useUnit(assetsModel.$activeShards);
  const query = useUnit(assetsSearchModel.$query);
  const hideZeroBalances = useUnit(assetsSettingsModel.$hideZeroBalances);

  return (
    <>
      <section className="h-full flex flex-col">
        <Header title={t(title)} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <div className="flex items-center gap-x-3">
            <AssetsSearch />
            <AssetsSettings />
          </div>
        </Header>
        <ShardSelectorButton />

        <AssetsChainView query={query} activeShards={activeShards} hideZeroBalances={hideZeroBalances} />
      </section>

      <ShardSelectorModal onConfirm={assetsModel.events.activeShardsSet} />
      <Outlet />
    </>
  );
};
