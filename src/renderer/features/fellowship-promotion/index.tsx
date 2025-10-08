import { useI18n } from '@/shared/i18n';
import { CaptionText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { memberService } from '@/domains/collectives';
import { profileInfoSlot } from '@/features/fellowship-profile';

import { fellowshipPromotionFeature } from './models/feature';
import { PromotionWidget } from './ui/PromotionWidget';

export { fellowshipPromotionFeature };

export { referendumWidgetActionSlot } from './ui/PromotionWidget';

fellowshipPromotionFeature.inject(profileInfoSlot, {
  order: 1,
  render: ({ member }) => {
    const { t } = useI18n();

    if (!memberService.canPromote(member)) return null;

    return (
      <Box gap={2}>
        <CaptionText>{t('fellowship.promotion.title')}</CaptionText>
        <PromotionWidget member={member} />
      </Box>
    );
  },
});
