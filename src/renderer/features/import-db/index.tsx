import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { BodyText, Button, Icon } from '@/shared/ui';
import { onboardingActionsSlot } from '@/pages/Onboarding';

import { ImportDBModal } from './components/importDBModal';

export const importDBFeature = createFeature({
  name: 'import/db',
  enable: $features.map(({ importDB }) => importDB),
});

importDBFeature.inject(onboardingActionsSlot, {
  order: 6,
  render() {
    const { t } = useI18n();

    return (
      <ImportDBModal>
        <div className="border border-alert bg-alert-background-warning p-2">
          <BodyText className="mb-2 flex items-center justify-center gap-1 text-alert">
            <Icon name="warn" size={12} className="text-inherit" />
            {/* eslint-disable i18next/no-literal-string */}
            <span>DEV MODE</span>
          </BodyText>
          <Button className="w-full">{t('importDB.importTitle')}</Button>
        </div>
      </ImportDBModal>
    );
  },
});
