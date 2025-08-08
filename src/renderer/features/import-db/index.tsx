import { $features } from '@/shared/config/features';
import { TEST_IDS } from '@/shared/constants';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { BodyText, Button, Icon } from '@/shared/ui';
import { onboardingActionsSlot } from '@/pages/Onboarding';
import { generalActionsSlot } from '@/pages/Settings/Overview/components';

import { ImportDBModal } from './components/ImportDBModal';
import { ImportDBSetting } from './components/ImportDBSetting';

export const importDBFeature = createFeature({
  name: 'import/db',
  enable: $features.map(({ importDB }) => importDB),
});

importDBFeature.inject(generalActionsSlot, {
  order: 1,
  render: () => <ImportDBSetting />,
});

importDBFeature.inject(onboardingActionsSlot, {
  order: 7,
  render() {
    const { t } = useI18n();

    return (
      <ImportDBModal>
        <div className="rounded-lg border border-alert bg-alert-background-warning p-2">
          <BodyText className="mb-2 flex items-center justify-center gap-1 text-alert">
            <Icon name="warn" size={12} className="text-inherit" />
            {/* eslint-disable i18next/no-literal-string */}
            <span>DEV MODE</span>
          </BodyText>
          <Button className="w-full" testId={TEST_IDS.ONBOARDING.IMPORT_DATABASE_BUTTON}>
            {t('importDB.importTitle')}
          </Button>
        </div>
      </ImportDBModal>
    );
  },
});
