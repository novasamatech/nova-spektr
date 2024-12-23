import { KeyType } from '@/shared/core';
import { type IconNames } from '@/shared/ui/types';

export const KEY_NAMES = {
  [KeyType.MAIN]: 'Main',
  [KeyType.HOT]: 'Hot wallet account',
  [KeyType.PUBLIC]: 'Pub account',
  [KeyType.CUSTOM]: '',
};

export const SHARDED_KEY_NAMES = {
  [KeyType.MAIN]: 'Main sharded',
  [KeyType.HOT]: '',
  [KeyType.PUBLIC]: '',
  [KeyType.CUSTOM]: '',
};

export const KeyIcon: Record<KeyType, IconNames> = {
  [KeyType.CUSTOM]: 'keyCustom',
  [KeyType.HOT]: 'keyHot',
  [KeyType.MAIN]: 'keyMain',
  [KeyType.PUBLIC]: 'keyPublic',
};
