/* eslint-disable import-x/max-dependencies */

import ActivateSalaryIcon from '@/shared/assets/images/fellowship/activate-salary.svg?jsx';
import PromotionRank1Icon from '@/shared/assets/images/fellowship/promotion-rank-1.svg?jsx';
import PromotionRank2Icon from '@/shared/assets/images/fellowship/promotion-rank-2.svg?jsx';
import PromotionRank3Icon from '@/shared/assets/images/fellowship/promotion-rank-3.svg?jsx';
import PromotionRank4Icon from '@/shared/assets/images/fellowship/promotion-rank-4.svg?jsx';
import PromotionRank5Icon from '@/shared/assets/images/fellowship/promotion-rank-5.svg?jsx';
import PromotionRank6Icon from '@/shared/assets/images/fellowship/promotion-rank-6.svg?jsx';
import PromotionRank7Icon from '@/shared/assets/images/fellowship/promotion-rank-7.svg?jsx';
import PromotionRank8Icon from '@/shared/assets/images/fellowship/promotion-rank-8.svg?jsx';
import PromotionRank9Icon from '@/shared/assets/images/fellowship/promotion-rank-9.svg?jsx';
import RequestSalaryIcon from '@/shared/assets/images/fellowship/request-salary.svg?jsx';
import RetentionRank1Icon from '@/shared/assets/images/fellowship/retention-rank-1.svg?jsx';
import RetentionRank2Icon from '@/shared/assets/images/fellowship/retention-rank-2.svg?jsx';
import RetentionRank3Icon from '@/shared/assets/images/fellowship/retention-rank-3.svg?jsx';
import RetentionRank4Icon from '@/shared/assets/images/fellowship/retention-rank-4.svg?jsx';
import RetentionRank5Icon from '@/shared/assets/images/fellowship/retention-rank-5.svg?jsx';
import RetentionRank6Icon from '@/shared/assets/images/fellowship/retention-rank-6.svg?jsx';
import RetentionRank7Icon from '@/shared/assets/images/fellowship/retention-rank-7.svg?jsx';
import RetentionRank8Icon from '@/shared/assets/images/fellowship/retention-rank-8.svg?jsx';
import RetentionRank9Icon from '@/shared/assets/images/fellowship/retention-rank-9.svg?jsx';
import RFCIcon from '@/shared/assets/images/fellowship/rfc.svg?jsx';
import Spend from '@/shared/assets/images/fellowship/spend.svg?jsx';
import SubmitPromotionEvidenceIcon from '@/shared/assets/images/fellowship/submit-promotion-evidence.svg?jsx';
import SubmitRetentionEvidenceIcon from '@/shared/assets/images/fellowship/submit-retention-evidence.svg?jsx';
import WhitelistVotingIcon from '@/shared/assets/images/fellowship/whitelist.svg?jsx';
import WithdrawSalaryIcon from '@/shared/assets/images/fellowship/withdraw-salary.svg?jsx';

const FellowshipImages = {
  promotionRank1: { svg: PromotionRank1Icon },
  promotionRank2: { svg: PromotionRank2Icon },
  promotionRank3: { svg: PromotionRank3Icon },
  promotionRank4: { svg: PromotionRank4Icon },
  promotionRank5: { svg: PromotionRank5Icon },
  promotionRank6: { svg: PromotionRank6Icon },
  promotionRank7: { svg: PromotionRank7Icon },
  promotionRank8: { svg: PromotionRank8Icon },
  promotionRank9: { svg: PromotionRank9Icon },
  retentionRank1: { svg: RetentionRank1Icon },
  retentionRank2: { svg: RetentionRank2Icon },
  retentionRank3: { svg: RetentionRank3Icon },
  retentionRank4: { svg: RetentionRank4Icon },
  retentionRank5: { svg: RetentionRank5Icon },
  retentionRank6: { svg: RetentionRank6Icon },
  retentionRank7: { svg: RetentionRank7Icon },
  retentionRank8: { svg: RetentionRank8Icon },
  retentionRank9: { svg: RetentionRank9Icon },
  withdrawSalary: { svg: WithdrawSalaryIcon },
  requestSalary: { svg: RequestSalaryIcon },
  activateSalary: { svg: ActivateSalaryIcon },
  submitPromotionEvidence: { svg: SubmitPromotionEvidenceIcon },
  submitRetentionEvidence: { svg: SubmitRetentionEvidenceIcon },
  rfc: { svg: RFCIcon },
  whitelist: { svg: WhitelistVotingIcon },
  spend: { svg: Spend },
} as const;

export type Fellowship = keyof typeof FellowshipImages;

export default FellowshipImages;
