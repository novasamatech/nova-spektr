import { GraphQLClient, gql } from 'graphql-request';
import { uniq } from 'lodash';
import { z } from 'zod';

import { type Chain, type ChainId, CryptoType, ProxyVariant } from '@/shared/core';
import { entries, groupBy, isEthereumAccountId, isHex, nullable } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { networkUtils } from '@/entities/network';
import { multisigOperationService } from '../multisig-operation/service';

import { INDEXER_URL } from './constants';
import { type AccountProvider, type SyncedMultisigAccount, type SyncedProxiedAccount } from './types';

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

// proxieds

const PROXIED_ACCOUNT_QUERY = gql`
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
        spawner
      }
    }
  }
`;

const proxiedSchema = z.object({
  accountId: accountIdSchema,
  proxyAccountId: accountIdSchema,
  chainId: chainIdSchema,
  isPureProxy: z.boolean(),
  type: z.string(),
  extrinsicIndex: z.number(),
  blockNumber: z.number().transform(pjsSchema.helpers.toBlockHeight),
  spawner: accountIdSchema.nullable().transform(val => val ?? undefined),
});

export const proxiedAccountsProvider: AccountProvider<SyncedProxiedAccount> = {
  getSupportedChains: (chains: Chain[]) => {
    return chains.filter(chain => networkUtils.isProxySupported(chain.options));
  },

  async fn(accounts, chains) {
    const accountsSet = new Set(accounts);
    const result: SyncedProxiedAccount[] = [];

    const client = new GraphQLClient(INDEXER_URL);
    const response = await client.request<{ proxieds: { nodes: unknown[] } }, { accounts: AccountId[] }>(
      PROXIED_ACCOUNT_QUERY,
      { accounts },
    );

    const parsed = response.proxieds.nodes.map(x => proxiedSchema.parse(x));

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

          result.push({
            type: 'proxied',
            accountId,
            proxyAccountId,
            chainId,
            deposit: proxied.value.deposit,
            delay: proxy.delay,
            proxyType: proxy.proxyType,
            proxyVariant: proxyFromIndexer.isPureProxy ? ProxyVariant.PURE : ProxyVariant.REGULAR,
            entropyBlockNumber: proxyFromIndexer.blockNumber,
            extrinsicIndex: proxyFromIndexer.extrinsicIndex,
            spawner: proxyFromIndexer.spawner,
          });
        }
      }
    }

    return result;
  },
};

// multisig

const MULTISIG_ACCOUNTS_QUERY = gql`
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
  getSupportedChains: (chains: Chain[]) => {
    return chains.filter(chain => networkUtils.isMultisigSupported(chain.options));
  },

  async fn(accounts) {
    const result: SyncedMultisigAccount[] = [];

    // subquery request
    const client = new GraphQLClient(INDEXER_URL);
    const response = await client.request<{ accounts: { nodes: unknown[] } }, { accounts: AccountId[] }>(
      MULTISIG_ACCOUNTS_QUERY,
      { accounts },
    );

    const parsed = response.accounts.nodes.map(x => multisigSchema.parse(x));
    // multisigs can be duplicated because each chain can provide own multisig account with same address
    const processed = new Set<AccountId>(accounts);

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

// chains metadata

const METADATAS_QUERY = gql`
  query Metadatas {
    _metadatas {
      nodes {
        chain
        lastProcessedHeight
        genesisHash
      }
    }
  }
`;

const metadataSchema = z.object({
  chain: z.string(),
  lastProcessedHeight: z.number(),
  genesisHash: z.string<ChainId>(),
});

export const indexedBlocksProvider = {
  async fn(): Promise<Map<ChainId, number>> {
    const client = new GraphQLClient(INDEXER_URL);
    const response = await client.request<{
      _metadatas: { nodes: { chain: string; genesisHash: ChainId; lastProcessedHeight: number }[] };
    }>(METADATAS_QUERY);

    const parsedData = response._metadatas.nodes.map(x => metadataSchema.parse(x));
    const metadataMap = new Map<ChainId, number>();

    for (const meta of parsedData) {
      metadataMap.set(meta.genesisHash, meta.lastProcessedHeight);
    }

    return metadataMap;
  },
};
