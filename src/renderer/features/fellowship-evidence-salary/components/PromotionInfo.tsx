import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { getRelativeTimeFromApi } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';
import { CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { memberService } from '@/domains/collectives';
import { retentionEvidence } from '../model/evidence';
import { fellowshipSalaryFeature } from '../model/feature';
import { profile } from '../model/profile';

export const PromotionInfo = memo(() => {
  const [timeLeft, setTimeLeft] = useState(0);

  const input = useUnit(fellowshipSalaryFeature.input);
  const currentMember = useUnit(profile.$member);
  const nextTrack = useUnit(retentionEvidence.$nextTrack);
  const currentBlock = useUnit(retentionEvidence.$currentBlock);
  const promotionPeriod = useUnit(retentionEvidence.$promotionPeriod);

  useEffect(() => {
    if (input?.api && promotionPeriod) {
      const gone =
        currentBlock - (currentMember && memberService.isCoreMember(currentMember) ? currentMember.lastPromotion : 0);
      const left = promotionPeriod - gone;
      if (left > 0) {
        getRelativeTimeFromApi(promotionPeriod - gone, input.api).then(setTimeLeft);
      } else {
        setTimeLeft(0);
      }
    }
  }, [input?.api, promotionPeriod, currentBlock, currentMember]);

  if (timeLeft > 0) return null;

  return (
    <Box gap={6}>
      <Box direction="row" verticalAlign="center" horizontalAlign="space-between">
        <CaptionText className="uppercase text-text-secondary">Next promotion</CaptionText>
        <CollectiveRank rank={nextTrack?.id ?? 0}>{nextTrack?.name.replace(/s$/, '')}</CollectiveRank>
      </Box>
    </Box>
  );
});
