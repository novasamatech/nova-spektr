import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { NavItem, navigationBottomLinksSlot } from '@/features/app-shell';

export const notificationsNavigationFeature = createFeature({
  name: 'notifications/navigation',
  enable: $features.map(({ notifications }) => notifications),
});

notificationsNavigationFeature.inject(navigationBottomLinksSlot, {
  order: 1,
  render() {
    const { t } = useI18n();
    return <NavItem icon="notification" title={t('navigation.notificationsLabel')} link={Paths.NOTIFICATIONS} />;
  },
});
