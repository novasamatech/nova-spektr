import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { fellowshipActivityFeedFeature } from '../model/feature';

import { ActivityListBase } from './ActivityListBase';

export const ActivityModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipActivityFeedFeature.input);

  if (nullable(input)) return children;

  return (
    <Modal size="md" height="lg">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.activityFeed.activityModal.title')}</Modal.Title>
      <Modal.Content>
        <div className="bg-main-app-background">
          <ActivityListBase limit={Number.POSITIVE_INFINITY} isFullVersion={true}>
            {children}
          </ActivityListBase>
        </div>
      </Modal.Content>
    </Modal>
  );
};
