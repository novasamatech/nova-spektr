import DDCustomImg, { ReactComponent as DDCustomSvg } from '@shared/assets/images/keyTypes/dd-custom.svg';
import DDGovernanceImg, { ReactComponent as DDGovernanceSvg } from '@shared/assets/images/keyTypes/dd-governance.svg';
import DDHotImg, { ReactComponent as DDHotSvg } from '@shared/assets/images/keyTypes/dd-hot.svg';
import DDMainImg, { ReactComponent as DDMainSvg } from '@shared/assets/images/keyTypes/dd-main.svg';
import DDPublicImg, { ReactComponent as DDPublicSvg } from '@shared/assets/images/keyTypes/dd-public.svg';
import DDStakingImg, { ReactComponent as DDStakingSvg } from '@shared/assets/images/keyTypes/dd-staking.svg';

const KeyTypeImages = {
  keyMain: { img: DDMainImg, svg: DDMainSvg },
  keyHot: { img: DDHotImg, svg: DDHotSvg },
  keyCustom: { img: DDCustomImg, svg: DDCustomSvg },
  keyGovernance: { img: DDGovernanceImg, svg: DDGovernanceSvg },
  keyPublic: { img: DDPublicImg, svg: DDPublicSvg },
  keyStaking: { img: DDStakingImg, svg: DDStakingSvg },
} as const;

export type KeyImages = keyof typeof KeyTypeImages;

export default KeyTypeImages;
