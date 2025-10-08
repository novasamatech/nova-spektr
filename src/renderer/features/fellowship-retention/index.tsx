import { useI18n } from '@/shared/i18n';
import { CaptionText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { memberService } from '@/domains/collectives';
import { profileInfoSlot } from '@/features/fellowship-profile';

import { fellowshipRetentionFeature } from './models/feature';
import { RetentionWidget } from './ui/RetentionWidget';

export { fellowshipRetentionFeature };

export { referendumWidgetActionSlot } from './ui/RetentionWidget';

fellowshipRetentionFeature.inject(profileInfoSlot, {
  order: 0,
  render: ({ member }) => {
    const { t } = useI18n();

    if (!memberService.shouldProve(member)) return null;

    return (
      <Box gap={2}>
        <CaptionText>{t('fellowship.retention.title')}</CaptionText>
        <RetentionWidget member={member} />
      </Box>
    );
  },
});
