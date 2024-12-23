import { useUnit } from 'effector-react';
import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton, Switch } from '@/shared/ui';
import { Box, Field, Popover, Select } from '@/shared/ui-kit';
import { AssetsListView } from '@/entities/asset';
import { assetsSettingsModel } from '../model/assets-settings-modal';

export const AssetsSettings = memo(() => {
  const { t } = useI18n();

  const assetsView = useUnit(assetsSettingsModel.$assetsView);
  const hideZeroBalances = useUnit(assetsSettingsModel.$hideZeroBalances);

  return (
    <Popover align="end">
      <Popover.Trigger>
        <div className="relative">
          <IconButton name="settingsLite" className="p-1.5" testId={TEST_IDS.ASSETS.SETTINGS_WIDGET} />
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
          <Field text={t('balances.pageView')}>
            <Select
              placeholder={t('settings.networks.selectorPlaceholder')}
              value={assetsView.toString()}
              onChange={(value) => assetsSettingsModel.events.assetsViewChanged(Number(value))}
            >
              <Select.Item value={AssetsListView.TOKEN_CENTRIC.toString()}>
                <FootnoteText>{t('balances.tokenCentric')}</FootnoteText>
              </Select.Item>
              <Select.Item value={AssetsListView.CHAIN_CENTRIC.toString()}>
                <FootnoteText>{t('balances.chainCentric')}</FootnoteText>
              </Select.Item>
            </Select>
          </Field>
        </Box>
      </Popover.Content>
    </Popover>
  );
});
