import { useUnit } from 'effector-react';

import { Switch, IconButton, MenuPopover, SearchInput } from '@shared/ui';
import { useI18n } from '@app/providers';
import { assetsModel } from '@entities/asset';
import { assetsViewModel } from '../../model/assets-view-model';

export const AssetsFilters = () => {
  const { t } = useI18n();

  const query = useUnit(assetsModel.$query);
  const hideZeroBalances = useUnit(assetsModel.$hideZeroBalances);

  return (
    <div className="flex items-center gap-x-3">
      <SearchInput
        value={query}
        placeholder={t('balances.searchPlaceholder')}
        className="w-[230px]"
        onChange={assetsModel.events.queryChanged}
      />

      <MenuPopover
        className="w-[182px] px-4"
        position="top-full right-0"
        buttonClassName="rounded-full"
        offsetPx={0}
        content={
          <Switch
            checked={hideZeroBalances}
            labelPosition="right"
            className="gap-x-2"
            onChange={assetsViewModel.events.hideZeroBalancesChanged}
          >
            {t('balances.hideZeroBalancesLabel')}
          </Switch>
        }
      >
        <div className="relative">
          <IconButton name="settingsLite" className="p-1.5" />
          {hideZeroBalances && <span className="absolute rounded-full w-1.5 h-1.5 right-0 top-0 bg-icon-accent" />}
        </div>
      </MenuPopover>
    </div>
  );
};
