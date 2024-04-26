import { useUnit } from 'effector-react';

import { Switch, IconButton, MenuPopover, Select, FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { AssetsPageView } from '@entities/asset';
import { assetsSettingsModel } from '../model/assets-settings-modal';

export const AssetsSettings = () => {
  const { t } = useI18n();

  const assetsView = useUnit(assetsSettingsModel.$assetsView);
  const hideZeroBalances = useUnit(assetsSettingsModel.$hideZeroBalances);

  const options = [
    {
      id: AssetsPageView.TOKEN_CENTRIC.toString(),
      value: AssetsPageView.TOKEN_CENTRIC,
      element: <FootnoteText>{t('balances.tokenCentric')}</FootnoteText>,
    },
    {
      id: AssetsPageView.CHAIN_CENTRIC.toString(),
      value: AssetsPageView.CHAIN_CENTRIC,
      element: <FootnoteText>{t('balances.chainCentric')}</FootnoteText>,
    },
  ];

  return (
    <MenuPopover
      className="w-[182px] px-4"
      position="top-full right-0"
      buttonClassName="rounded-full"
      offsetPx={0}
      content={
        <>
          <Switch
            checked={hideZeroBalances}
            labelPosition="right"
            className="gap-x-2"
            onChange={assetsSettingsModel.events.hideZeroBalancesChanged}
          >
            {t('balances.hideZeroBalancesLabel')}
          </Switch>
          <hr className="border-divider -mx-3 my-4" />
          <Select
            label={t('balances.pageView')}
            selectedId={assetsView.toString()}
            placeholder={t('settings.networks.selectorPlaceholder')}
            options={options}
            onChange={({ value }) => assetsSettingsModel.events.assetsViewChanged(value)}
          />
        </>
      }
    >
      <div className="relative">
        <IconButton name="settingsLite" className="p-1.5" />
        {hideZeroBalances && <span className="absolute rounded-full w-1.5 h-1.5 right-0 top-0 bg-icon-accent" />}
      </div>
    </MenuPopover>
  );
};
