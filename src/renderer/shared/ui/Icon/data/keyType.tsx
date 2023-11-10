import DDMainImg, { ReactComponent as DDMainSvg } from '@images/keyTypes/dd-main.svg';
import DDHotImg, { ReactComponent as DDHotSvg } from '@images/keyTypes/dd-hot.svg';
import DDCustomImg, { ReactComponent as DDCustomSvg } from '@images/keyTypes/dd-custom.svg';
import DDGovernanceImg, { ReactComponent as DDGovernanceSvg } from '@images/keyTypes/dd-governance.svg';
import DDPublicImg, { ReactComponent as DDPublicSvg } from '@images/keyTypes/dd-public.svg';
import DDStakingImg, { ReactComponent as DDStakingSvg } from '@images/keyTypes/dd-staking.svg';

const KeyTypeImaes = {
  ddMain: { img: DDMainImg, svg: DDMainSvg },
  ddHot: { img: DDHotImg, svg: DDHotSvg },
  ddCustom: { img: DDCustomImg, svg: DDCustomSvg },
  ddGovernance: { img: DDGovernanceImg, svg: DDGovernanceSvg },
  ddPublic: { img: DDPublicImg, svg: DDPublicSvg },
  ddStaking: { img: DDStakingImg, svg: DDStakingSvg },
} as const;

export type KeyImages = keyof typeof KeyTypeImaes;

export default KeyTypeImaes;
