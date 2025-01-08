/* eslint-disable import-x/max-dependencies */

import DDCustomIcon from '@/shared/assets/images/keyTypes/dd-custom.svg?jsx';
import DDGovernanceIcon from '@/shared/assets/images/keyTypes/dd-governance.svg?jsx';
import DDHotIcon from '@/shared/assets/images/keyTypes/dd-hot.svg?jsx';
import DDMainIcon from '@/shared/assets/images/keyTypes/dd-main.svg?jsx';
import DDPublicIcon from '@/shared/assets/images/keyTypes/dd-public.svg?jsx';
import DDStakingIcon from '@/shared/assets/images/keyTypes/dd-staking.svg?jsx';

const KeyTypeImages = {
  keyMain: { svg: DDMainIcon },
  keyHot: { svg: DDHotIcon },
  keyCustom: { svg: DDCustomIcon },
  keyGovernance: { svg: DDGovernanceIcon },
  keyPublic: { svg: DDPublicIcon },
  keyStaking: { svg: DDStakingIcon },
} as const;

export type KeyImages = keyof typeof KeyTypeImages;

export default KeyTypeImages;
