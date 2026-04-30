import { combine } from 'effector';

import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';

import { mergeMultisigCandidates } from './lib/merge-candidates';

const $candidates = combine(walletModel.$wallets, contactModel.$contacts, mergeMultisigCandidates);

export const multisigCandidates = {
  $candidates,
};
