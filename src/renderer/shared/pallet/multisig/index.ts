import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const multisigPallet = {
  consts,
  schema,
  storage,
};

export type { MultisigTimepoint, Multisig } from './schema';
