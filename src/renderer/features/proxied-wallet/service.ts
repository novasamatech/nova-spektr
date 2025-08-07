import { type ProxiedAccount } from '@/shared/core';
import { type AnyAccount, type AnyDecodedTransaction, type Section } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { type ProxyTransaction } from './types';

// type Call = {
//   type: 'call';
//   name: Section;
// };
//
// type ProxyCall = {
//   type: 'proxy';
//   name: ProxyType;
// };

// function createProxyCall(proxyType: ProxyType, call: Section): ProxyCall | null {
//   const Staking: Section[] = ['Utility', 'Staking', 'Session', 'FastUnstake', 'VoterList', 'NominationPools'];
//   const NominationPools: Section[] = ['Utility', 'NominationPools'];
//   const CancelProxy: Section[] = ['Proxy'];
//   const Auction: Section[] = ['Auctions', 'Crowdloan', 'Registrar', 'Slots'];
//   const IdentityJudgement: Section[] = ['IdentityJudgement'];
//   const Governance: Section[] = [
//     'Utility',
//     'Treasury',
//     'Bounties',
//     'ChildBounties',
//     'ConvictionVoting',
//     'Referenda',
//     'Whitelist',
//   ];
//
//   if (proxyType === 'Any') {
//     return {
//       type: 'proxy',
//       name: 'Any',
//     };
//   }
//
//   if (proxyType === 'NonTransfer' && call !== 'Balances') {
//     return {
//       type: 'proxy',
//       name: 'NonTransfer',
//     };
//   }
//
//   if (proxyType === 'Staking' && Staking.includes(call)) {
//     return {
//       type: 'proxy',
//       name: 'Staking',
//     };
//   }
//
//   if (proxyType === 'NominationPools' && NominationPools.includes(call)) {
//     return {
//       type: 'proxy',
//       name: 'NominationPools',
//     };
//   }
//
//   if (proxyType === 'Auction' && Auction.includes(call)) {
//     return {
//       type: 'proxy',
//       name: 'Auction',
//     };
//   }
//
//   if (proxyType === 'Governance' && Governance.includes(call)) {
//     return {
//       type: 'proxy',
//       name: 'Governance',
//     };
//   }
//
//   if (proxyType === 'CancelProxy' && CancelProxy.includes(call)) {
//     return {
//       type: 'proxy',
//       name: 'CancelProxy',
//     };
//   }
//
//   if (proxyType === 'IdentityJudgement' && IdentityJudgement.includes(call)) {
//     return {
//       type: 'proxy',
//       name: 'IdentityJudgement',
//     };
//   }
//
//   return null;
// }

// function narrowProxyCall(proxyCall: ProxyCall, proxyType: ProxyType): ProxyCall | null {
//   if (isSuperset(proxyCall.name, proxyType)) {
//     return {
//       type: 'proxy',
//       name: proxyType,
//     };
//   }
//   return null;
// }

// function isSuperset(x: ProxyType, y: ProxyType) {
//   if (x === y) return true;
//   if (x === 'Any') return true;
//   if (y === 'Any') return false;
//   if (x === 'NonTransfer') return true;
//   return false;
// }

function checkPermission(
  route: AnyAccount[],
  // eslint-disable-next-line unused-imports/no-unused-vars
  call: Section,
): { success: true } | { success: false; account: ProxiedAccount } {
  const proxiedRoute = route.filter(accountUtils.isProxiedAccount);
  if (proxiedRoute.length === 0) {
    return { success: true };
  }

  // const res: Call | ProxyCall = {
  //   type: 'call',
  //   name: call,
  // };

  // for (const account of proxiedRoute) {
  //   if (res.type === 'call') {
  //     const proxyCall = createProxyCall(account.proxyType, call);
  //     if (!proxyCall) return { success: false, account };
  //
  //     res = proxyCall;
  //     continue;
  //   } else {
  //     const proxyCall = narrowProxyCall(res, account.proxyType);
  //     if (!proxyCall) {
  //       return { success: false, account };
  //     }
  //     res = proxyCall;
  //   }
  // }

  return { success: true };
}

function isProxyTransaction(transaction: AnyDecodedTransaction): transaction is ProxyTransaction {
  return transaction.section === 'proxy' && transaction.method === 'proxy';
}

export const proxyService = {
  isProxyTransaction,
  checkPermission,
};

// function filterProxyCall(proxyType: ProxyType, call: CallType): boolean {
//   const Staking: CallType[] = ['Utility', 'Staking', 'Session', 'FastUnstake', 'VoterList', 'NominationPools'];
//   const NominationPools: CallType[] = ['Utility', 'NominationPools'];
//   const CancelProxy: CallType[] = ['Proxy'];
//   const Auction: CallType[] = ['Auctions', 'Crowdloan', 'Registrar', 'Slots'];
//   const IdentityJudgement: CallType[] = ['IdentityJudgement'];
//   const Governance: CallType[] = [
//     'Utility',
//     'Treasury',
//     'Bounties',
//     'ChildBounties',
//     'ConvictionVoting',
//     'Referenda',
//     'Whitelist',
//   ];
//
//   if (proxyType === 'Any') {
//     return true;
//   }
//
//   if (proxyType === 'NonTransfer' && call !== 'Transfer') {
//     return true;
//   }
//
//   if (proxyType === 'Staking' && Staking.includes(call)) {
//     return true;
//   }
//
//   if (proxyType === 'NominationPools' && NominationPools.includes(call)) {
//     return true;
//   }
//
//   if (proxyType === 'Auction' && Auction.includes(call)) {
//     return true;
//   }
//
//   if (proxyType === 'Governance' && Governance.includes(call)) {
//     return true;
//   }
//
//   if (proxyType === 'CancelProxy' && CancelProxy.includes(call)) {
//     return true;
//   }
//
//   if (proxyType === 'IdentityJudgement' && IdentityJudgement.includes(call)) {
//     return true;
//   }
//
//   return false;
// }
//
// function checkPermission2(
//   route: AnyAccount[],
//   call: CallType,
// ): { success: true } | { success: false; account: AnyAccount } {
//   if (route.length === 0) {
//     return { success: true };
//   }
//
//   let res: Call | ProxyCall = {
//     type: 'call',
//     name: call,
//   };
//
//   for (const account of route) {
//     if (accountUtils.isMultisigAccount(account)) {
//       res = {
//         type: 'call',
//         name: 'Multisig',
//       };
//       continue;
//     }
//
//     if (accountUtils.isProxiedAccount(account)) {
//       if (!filterProxyCall(account.proxyType, res)) {
//         return { success: false, account };
//       }
//
//       res = {
//         type: 'proxy',
//       };
//     }
//   }
//
//   return { success: true };
// }
