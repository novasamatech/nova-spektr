import DDMainImg, { ReactComponent as DDMainSvg } from '@images/keyTypes/dd-main.svg';
import DDHotImg, { ReactComponent as DDHotSvg } from '@images/keyTypes/dd-hot.svg';
import DDCustomImg, { ReactComponent as DDCustomSvg } from '@images/keyTypes/dd-custom.svg';
import DDGovernanceImg, { ReactComponent as DDGovernanceSvg } from '@images/keyTypes/dd-governance.svg';
import DDPublicImg, { ReactComponent as DDPublicSvg } from '@images/keyTypes/dd-public.svg';
import DDStakingImg, { ReactComponent as DDStakingSvg } from '@images/keyTypes/dd-staking.svg';

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
