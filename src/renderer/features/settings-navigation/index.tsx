import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { NavItem, navigationBottomLinksSlot } from '@/features/app-shell';

export const settingsNavigationFeature = createFeature({
  name: 'settings/navigation',
  enable: $features.map(({ settings }) => settings),
});

settingsNavigationFeature.inject(navigationBottomLinksSlot, {
  order: 3,
  render() {
    const { t } = useI18n();
    return <NavItem icon="settings" title={t('navigation.settingsLabel')} link={Paths.SETTINGS} />;
  },
});
