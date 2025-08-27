import { t } from 'i18next';

import { type ProxyType } from '@/shared/core';

export const ProxyTypeOperation: Record<ProxyType, string> = {
  ['Any']: t('proxy.operations.any'),
  ['NonTransfer']: t('proxy.operations.nonTransfer'),
  ['Staking']: t('proxy.operations.staking'),
  ['Auction']: t('proxy.operations.auction'),
  ['CancelProxy']: t('proxy.operations.cancelProxy'),
  ['Governance']: t('proxy.operations.governance'),
  ['IdentityJudgement']: t('proxy.operations.identityJudgement'),
  ['NominationPools']: t('proxy.operations.nominationPools'),
  ['SudoBalances']: t('proxy.operations.sudoBalances'),
};
