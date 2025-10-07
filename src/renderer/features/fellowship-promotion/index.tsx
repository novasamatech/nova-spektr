import { useI18n } from '@/shared/i18n';
import { CaptionText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { profileInfoSlot } from '@/features/fellowship-profile';

import { fellowshipPromotionFeature } from './models/feature';
import { PromotionWidget } from './ui/PromotionWidget';

export { fellowshipPromotionFeature };

export { referendumWidgetActionSlot } from './ui/PromotionWidget';

fellowshipPromotionFeature.inject(profileInfoSlot, {
  order: 1,
  render: ({ member }) => {
    const { t } = useI18n();
    return (
      <Box gap={2} padding={[2, 0]}>
        <CaptionText>{t('fellowship.promotion.title')}</CaptionText>
        <PromotionWidget member={member} />
      </Box>
    );
  },
});
