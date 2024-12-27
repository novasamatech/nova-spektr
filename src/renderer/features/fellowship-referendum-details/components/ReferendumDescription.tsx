import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText, HeaderTitleText, Icon, Markdown } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { referendumDetailsModel } from '../model/details';

import { ProposerName } from './ProposerName';

export const ReferendumDescription = () => {
  const { t } = useI18n();

  const referendumMeta = useUnit(referendumDetailsModel.$referendumMeta);
  const pendingReferendumMeta = useUnit(referendumDetailsModel.$pendingMeta);

  const metaLoadingState = pendingReferendumMeta && nullable(referendumMeta);

  const empty = !metaLoadingState && !referendumMeta?.title && !referendumMeta?.description;

  return (
    <Box padding={6} gap={4}>
      <ProposerName />
      <HeaderTitleText className="text-balance">
        {metaLoadingState ? <Skeleton height="1lh" width="80%" /> : referendumMeta?.title}
      </HeaderTitleText>
      {metaLoadingState ? (
        <Skeleton height="8lh" width="100%" />
      ) : (
        <Markdown>{referendumMeta?.description ?? ''}</Markdown>
      )}
      {empty && (
        <Box gap={2} horizontalAlign="center">
          <Icon name="emptyList" size={64} />
          <FootnoteText>{t('fellowship.details.noDetails')}</FootnoteText>
        </Box>
      )}
    </Box>
  );
};
