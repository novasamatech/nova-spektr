import { GraphQLClient, gql } from 'graphql-request';
import { uniq } from 'lodash';
import { z } from 'zod';

import { CryptoType, ProxyVariant } from '@/shared/core';
import { entries, groupBy, isEthereumAccountId, isHex, nullable } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { multisigOperationService } from '../multisig-operation/service';

import { INDEXER_URL } from './constants';
import { type AccountProvider, type SyncedMultisigAccount, type SyncedProxyAccount } from './types';

// generic helpers

const accountIdSchema = z.string().transform(pjsSchema.helpers.toAccountId);
const chainIdSchema = z.string().transform((id, ctx) => {
  if (isHex(id)) {
    return id;
  } else {
    ctx.addIssue(`not chain id: ${id}`);
    return z.NEVER;
  }
});

// proxy

const PROXY_ACCOUNT_QUERY = gql`
  query Proxieds($accounts: [String!]) {
    proxieds(filter: { proxyAccountId: { in: $accounts }, delay: { equalTo: 0 } }) {
      nodes {
        accountId
        proxyAccountId
        chainId
        isPureProxy
        type
        extrinsicIndex
        blockNumber
      }
    }
  }
`;

const PURE_PROXY_QUERY = gql`
  query PureProxies($accounts: [String!]) {
    pureProxies(filter: { accountId: { in: $accounts } }) {
      nodes {
        accountId
        chainId
      }
    }
  }
`;

const pureProxySchema = z.object({
  accountId: accountIdSchema,
  chainId: chainIdSchema,
});

const proxySchema = z.object({
  accountId: accountIdSchema,
  proxyAccountId: accountIdSchema,
  chainId: chainIdSchema,
  isPureProxy: z.boolean(),
  type: z.string(),
  extrinsicIndex: z.number(),
  blockNumber: z.number().transform(pjsSchema.helpers.toBlockHeight),
});

export const proxyAccountsProvider: AccountProvider<SyncedProxyAccount> = {
  async fn(accounts, chains) {
    const accountsSet = new Set(accounts);
    const result: SyncedProxyAccount[] = [];

    const client = new GraphQLClient(INDEXER_URL);
    const proxiedResponse = await client.request<{ proxieds: { nodes: unknown[] } }, { accounts: AccountId[] }>(
      PROXY_ACCOUNT_QUERY,
      { accounts },
    );

    const parsed = proxiedResponse.proxieds.nodes.map(x => proxySchema.parse(x));

    const accountIds = parsed.map(x => x.accountId);

    const pureProxiesResponse = await client.request<{ pureProxies: { nodes: unknown[] } }, { accounts: AccountId[] }>(
      PURE_PROXY_QUERY,
      { accounts: accountIds },
    );
    //todo remove when reindexing is done
    const pureProxies = pureProxiesResponse.pureProxies.nodes.map(x => pureProxySchema.parse(x));

    // Create lookup set for pure proxies
    const pureProxyLookup = new Set(pureProxies.map(pp => `${pp.accountId}:${pp.chainId}`));

    const indexerChainGroups = groupBy(parsed, g => g.chainId);

    // collecting on-chain requests
    const onChainProxiedRequests = [];
    for (const [chainId, indexerChainGroup] of entries(indexerChainGroups)) {
      if (nullable(indexerChainGroup)) continue;

      const chain = chains[chainId];
      if (nullable(chain)) continue;

      const proxiedAccountIds = uniq(indexerChainGroup.map(x => x.accountId));

      const onChainRequest = proxyPallet.storage
        .proxies(chain.api, proxiedAccountIds)
        .then(proxieds => ({ chainId, proxieds }));

      onChainProxiedRequests.push(onChainRequest);
    }
    const onChainProxieds = await Promise.all(onChainProxiedRequests);

    // actual processing
    for (const { chainId, proxieds } of onChainProxieds) {
      for (const proxied of proxieds) {
        for (const proxy of proxied.value.proxies) {
          const accountId = proxied.account;
          const proxyAccountId = proxy.delegate;

          // we don't support delayed proxies
          if (proxy.delay > 0) continue;

          // cut unwanted connections
          if (!accountsSet.has(proxyAccountId)) continue;

          const indexerChainGroup = indexerChainGroups[chainId];
          if (nullable(indexerChainGroup)) continue;

          const proxyFromIndexer = indexerChainGroup.find(a => {
            return a.accountId === accountId && a.proxyAccountId === proxyAccountId && a.type === proxy.proxyType;
          });
          if (nullable(proxyFromIndexer)) continue;

          // Check if this account is a pure proxy using the PureProxy table data
          const isPureProxy = pureProxyLookup.has(`${accountId}:${chainId}`);

          result.push({
            type: 'proxy',
            accountId,
            proxyAccountId,
            chainId,
            deposit: proxied.value.deposit,
            delay: proxy.delay,
            proxyType: proxy.proxyType,
            proxyVariant: isPureProxy ? ProxyVariant.PURE : ProxyVariant.REGULAR,
            blockNumber: proxyFromIndexer.blockNumber,
            extrinsicIndex: proxyFromIndexer.extrinsicIndex,
          });
        }
      }
    }

    return result;
  },
};

// multisig

const MULTISIG_ACCOUNT_QUERY = gql`
  query Multisigs($accounts: [String!]) {
    accounts(filter: { accountId: { in: $accounts } }) {
      nodes {
        accountId
        multisigs {
          nodes {
            multisig {
              accountId
              threshold
              signatories {
                nodes {
                  signatoryId
                }
              }
            }
          }
        }
      }
    }
  }
`;

const multisigSchema = z.object({
  accountId: accountIdSchema,
  multisigs: z.object({
    nodes: z.array(
      z.object({
        multisig: z.object({
          accountId: accountIdSchema,
          threshold: z.number(),
          signatories: z.object({
            nodes: z.array(
              z.object({
                signatoryId: accountIdSchema,
              }),
            ),
          }),
        }),
      }),
    ),
  }),
});

export const multisigAccountsProvider: AccountProvider<SyncedMultisigAccount> = {
  async fn(accounts) {
    const result: SyncedMultisigAccount[] = [];

    // subquery request
    const client = new GraphQLClient(INDEXER_URL);
    const response = await client.request<{ accounts: { nodes: unknown[] } }, { accounts: AccountId[] }>(
      MULTISIG_ACCOUNT_QUERY,
      { accounts },
    );

    const parsed = response.accounts.nodes.map(x => multisigSchema.parse(x));
    // multisigs can be duplicated because each chain can provide own multisig account with same address
    const processed = new Set<AccountId>();

    // actual processing
    for (const signatory of parsed) {
      for (const { multisig } of signatory.multisigs.nodes) {
        const accountId = multisig.accountId;
        const signatories = multisig.signatories.nodes.map(s => s.signatoryId);
        const cryptoType = isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519;
        const constructedAccountId = multisigOperationService.getMultisigAccountId(
          signatories,
          multisig.threshold,
          cryptoType,
        );

        if (constructedAccountId === accountId && !processed.has(accountId)) {
          result.push({
            type: 'multisig',
            accountId,
            signatories,
            threshold: multisig.threshold,
          });
          processed.add(accountId);
        }
      }
    }

    return result;
  },
};
