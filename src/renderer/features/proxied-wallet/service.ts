import { type ApiPromise } from '@polkadot/api';

import { type ProxiedAccount, type ProxyType } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type TransactionValidationPermissionError } from '@/shared/ui-entities';
import {
  type AnyAccount,
  type AnyDecodedTransaction,
  type AnyTransaction,
  type Extrinsic,
  transactionService,
} from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { type ProxyTransaction } from './types';

/**
 * Check if call can be executed with given proxy type
 *
 * TODO can be replaced with papi view function call after adoption
 *
 * ```ts
 * const res = await api.view.Proxy.check_permissions(
 *   extrinsic.decodedCall,
 *   { type: proxyType, value: undefined },
 * );
 * ```
 */
function checkCallPermission(proxyType: ProxyType, call: string): boolean {
  // known pallets that can be checked by hand.
  // this list may extend later, but it will be perfect if polkadot sdk will implement permission checks with query
  const Staking: string[] = ['utility', 'staking', 'session', 'fastUnstake', 'voterList', 'nominationPools'];
  const NominationPools: string[] = ['utility', 'nominationPools'];
  const CancelProxy: string[] = ['proxy'];
  const Auction: string[] = ['auctions', 'crowdloan', 'registrar', 'slots'];
  const IdentityJudgement: string[] = ['identityJudgement'];
  const Governance: string[] = [
    'utility',
    'treasury',
    'bounties',
    'childBounties',
    'convictionVoting',
    'referenda',
    'whitelist',
  ];

  if (proxyType === 'Any') {
    return true;
  }

  if (proxyType === 'NonTransfer') {
    return call !== 'balances' && call !== 'assets' && call !== 'currencies' && call !== 'tokens';
  }

  if (proxyType === 'Staking') {
    return Staking.includes(call);
  }

  if (proxyType === 'NominationPools') {
    return NominationPools.includes(call);
  }

  if (proxyType === 'Auction') {
    return Auction.includes(call);
  }

  if (proxyType === 'Governance') {
    return Governance.includes(call);
  }

  if (proxyType === 'CancelProxy') {
    return CancelProxy.includes(call);
  }

  if (proxyType === 'IdentityJudgement') {
    return IdentityJudgement.includes(call);
  }

  // escape hatch for non standart calls
  return true;
}

function checkPermission(
  api: ApiPromise,
  route: AnyAccount[],
  transaction: AnyTransaction,
): TransactionValidationPermissionError | null {
  if (route.length === 0) {
    return null;
  }

  // TODO redo all this parsing thing after migration to new transaction interface
  let extrinsic = transactionService.createExtrinsic(transaction, api);

  const inversedRoute = [...route].reverse();

  for (const [index, account] of inversedRoute.entries()) {
    if (accountUtils.isProxiedAccount(account)) {
      if (isProxyExtrinsic(extrinsic)) {
        extrinsic = transactionService.createExtrinsicFromCallData(extrinsic.args[2].toHex(), api);
      }

      const proxyAccount = inversedRoute.at(index - 1);
      if (nullable(proxyAccount)) return null;

      const connection = account.connections.find(c => c.proxyAccountId === proxyAccount.accountId);
      if (nullable(connection)) return null;

      if (checkCallPermission(connection.proxyType, extrinsic.method.section) === false) {
        return { account, permission: connection.proxyType };
      }
    } else {
      if (extrinsic.method.section === 'multisig' && extrinsic.method.method === 'asMulti') {
        extrinsic = transactionService.createExtrinsicFromCallData(extrinsic.args[3].toHex(), api);
      }
    }
  }

  return null;
}

function findProxyConnection(proxiedAccount: ProxiedAccount, proxyAccount: AnyAccount) {
  return proxiedAccount.connections.find(c => c.proxyAccountId === proxyAccount.accountId) ?? null;
}

function isProxyTransaction(transaction: AnyDecodedTransaction): transaction is ProxyTransaction {
  return transaction.section === 'proxy' && transaction.method === 'proxy';
}

function isProxyExtrinsic(extrinsic: Extrinsic): boolean {
  return extrinsic.method.section === 'proxy' && extrinsic.method.method === 'proxy';
}

export const proxiedService = {
  isProxyTransaction,
  isProxyExtrinsic,
  checkPermission,
  findProxyConnection,
};
