import { useUnit } from 'effector-react';
import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton, Select, Switch } from '@/shared/ui';
import { Box, Popover } from '@/shared/ui-kit';
import { AssetsListView } from '@/entities/asset';
import { assetsSettingsModel } from '../model/assets-settings-modal';

export const AssetsSettings = memo(() => {
  const { t } = useI18n();

  const assetsView = useUnit(assetsSettingsModel.$assetsView);
  const hideZeroBalances = useUnit(assetsSettingsModel.$hideZeroBalances);

  const options = [
    {
      id: AssetsListView.TOKEN_CENTRIC.toString(),
      value: AssetsListView.TOKEN_CENTRIC,
      element: <FootnoteText>{t('balances.tokenCentric')}</FootnoteText>,
    },
    {
      id: AssetsListView.CHAIN_CENTRIC.toString(),
      value: AssetsListView.CHAIN_CENTRIC,
      element: <FootnoteText>{t('balances.chainCentric')}</FootnoteText>,
    },
  ];

  return (
    <Popover testId={TEST_IDS.ASSETS.SETTINGS_WIDGET} align="end">
      <Popover.Trigger>
        <div className="relative">
          <IconButton name="settingsLite" className="p-1.5" />
          {hideZeroBalances && (
            <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-icon-accent duration-100 animate-in fade-in" />
          )}
        </div>
      </Popover.Trigger>
      <Popover.Content>
        <Box width="182px" padding={4}>
          <Switch
            checked={hideZeroBalances}
            labelPosition="right"
            className="gap-x-2"
            onChange={assetsSettingsModel.events.hideZeroBalancesChanged}
          >
            {t('balances.hideZeroBalancesLabel')}
          </Switch>
          <hr className="-mx-3 my-4 border-divider" />
          <Select
            label={t('balances.pageView')}
            selectedId={assetsView.toString()}
            placeholder={t('settings.networks.selectorPlaceholder')}
            options={options}
            onChange={({ value }) => assetsSettingsModel.events.assetsViewChanged(value)}
          />
        </Box>
      </Popover.Content>
    </Popover>
  );
});
