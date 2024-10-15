import { KeyType } from '@/shared/core';
import { type IconNames } from '@/shared/ui/types';

export const KEY_NAMES = {
  [KeyType.MAIN]: 'Main',
  [KeyType.HOT]: 'Hot wallet account',
  [KeyType.PUBLIC]: 'Pub account',
  [KeyType.STAKING]: 'Staking',
  [KeyType.GOVERNANCE]: 'Governance',
  [KeyType.CUSTOM]: '',
};

export const SHARDED_KEY_NAMES = {
  [KeyType.MAIN]: 'Main sharded',
  [KeyType.HOT]: '',
  [KeyType.PUBLIC]: '',
  [KeyType.STAKING]: 'Staking sharded',
  [KeyType.GOVERNANCE]: 'Governance sharded',
  [KeyType.CUSTOM]: '',
};

export const KeyIcon: Record<KeyType, IconNames> = {
  [KeyType.CUSTOM]: 'keyCustom',
  [KeyType.GOVERNANCE]: 'keyGovernance',
  [KeyType.HOT]: 'keyHot',
  [KeyType.MAIN]: 'keyMain',
  [KeyType.PUBLIC]: 'keyPublic',
  [KeyType.STAKING]: 'keyStaking',
};
