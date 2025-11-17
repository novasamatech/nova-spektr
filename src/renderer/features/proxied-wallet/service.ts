import { type ApiPromise } from '@polkadot/api';
import { type ApiDecoration } from '@polkadot/api/types';
import { type Codec } from '@polkadot/types/types';
import { stringToU8a, u8aConcatStrict, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, decodeAddress } from '@polkadot/util-crypto';
import { z } from 'zod';

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

/**
 * Parameters for calculating a pure account address
 */
export interface PureAccountParams {
  /** The spawner account (who creates the pure proxy) */
  spawner: string;
  /** The type of the proxy (e.g., 'Any', 'NonTransfer', etc.) */
  proxyType: Codec;
  /** A disambiguation index for multiple calls in the same transaction */
  index: number;
  /** Block height and extrinsic index when the pure account was created */
  maybeWhen: {
    blockHeight: number;
    extrinsicIndex: number;
  };
  /** The API instance */
  api: ApiDecoration<'promise'>;
}

/**
 * Calculate the address of a pure proxy account.
 *
 * This is a TypeScript port of the Substrate runtime's pure_account function
 * which generates deterministic addresses for pure proxy accounts.
 *
 * @param params - The parameters for pure account calculation
 * @param currentBlockHeight - Current block height (used if maybeWhen is not
 *   provided)
 * @param currentExtrinsicIndex - Current extrinsic index (used if maybeWhen is
 *   not provided)
 * @param api - The API instance
 *
 * @returns The calculated pure proxy account address as a hex string
 */
function calculatePureAccount(params: PureAccountParams): string {
  const { spawner: who, proxyType, index, maybeWhen, api } = params;

  // Decode the 'who' account to get the raw bytes
  const whoBytes = decodeAddress(who);

  // Create the entropy data following the Substrate pattern:
  // (b"modlpy/proxy____", who, height, ext_index, proxy_type, index)
  const entropy = createEntropyData(whoBytes, maybeWhen.blockHeight, maybeWhen.extrinsicIndex, proxyType, index, api);

  // Hash the entropy using blake2_256
  const hash = blake2AsU8a(entropy, 256);

  // The result is the account ID (32 or 20 bytes from the hash, depends on the spawner length)
  const accountId = hash.slice(0, whoBytes.length);

  return u8aToHex(accountId);
}

/**
 * Creates the entropy data for pure account calculation This mimics the SCALE
 * encoding of the tuple in Substrate
 */
function createEntropyData(
  who: Uint8Array,
  blockHeight: number,
  extrinsicIndex: number,
  proxyType: Codec,
  index: number,
  api: ApiDecoration<'promise'>,
): Uint8Array {
  // Substrate's module prefix for proxy pallet
  const modulePrefix = stringToU8a('modlpy/proxy____');

  const blockHeightBytes = api.registry.createType('u32', blockHeight).toU8a();

  const extrinsicIndexBytes = api.registry.createType('u32', extrinsicIndex).toU8a();

  // Encode proxy type as compact string
  const proxyTypeBytes = proxyType.toU8a();

  const indexBytes = api.registry.createType('u16', index).toU8a();

  // Concatenate all the data
  return u8aConcatStrict([modulePrefix, who, blockHeightBytes, extrinsicIndexBytes, proxyTypeBytes, indexBytes]);
}

export interface FindPureBlockNumberParams {
  /** The spawner account (who creates the pure proxy) */
  spawner: string;
  /** The expected pure account address */
  pure: string;
  /** The type of the proxy as string */
  type: Codec;
  /** A disambiguation index for multiple calls in the same transaction */
  disambiguationIndex: number;
  /** The original block number from the event */
  blockNumber: number;
  /** The extrinsic index from the event */
  extrinsicIndex: number;
  /** The API instance */
  api: ApiDecoration<'promise'>;
}

const validationDataSchema = z.object({
  relayParentNumber: z.number(),
});

/**
 * Finds the correct block number for pure proxy creation by checking both the
 * original block number and the relay parent number if needed.
 *
 * @param params - The parameters for finding the pure block number
 *
 * @returns The correct block number to use for the pure proxy
 *
 * @throws Error if neither block number nor relay parent number produces the
 *   expected pure account
 */
async function findPureBlockNumber(params: FindPureBlockNumberParams): Promise<number> {
  const { spawner, pure, type, disambiguationIndex, blockNumber, extrinsicIndex, api } = params;

  // First try with the original block number
  const pureAccount = calculatePureAccount({
    spawner,
    proxyType: type,
    index: disambiguationIndex,
    maybeWhen: { blockHeight: blockNumber, extrinsicIndex },
    api,
  });

  // If the calculated pure account matches the expected one, use the original block number
  if (pure === pureAccount) {
    return blockNumber;
  }

  // If not, try with the relay parent number
  const validationData = await api.query?.['parachainSystem']?.['validationData']?.();

  if (!validationData) {
    throw new Error(`Validation data not found, time to die`);
  }

  const parseResult = validationDataSchema.safeParse(validationData.toJSON());

  if (!parseResult.success) {
    throw new Error(`Invalid validation data ${parseResult.error.message}`);
  }

  const relayParentNumber = parseResult.data.relayParentNumber;

  const pureAccountRelayParent = calculatePureAccount({
    spawner,
    proxyType: type,
    index: disambiguationIndex,
    maybeWhen: { blockHeight: relayParentNumber, extrinsicIndex },
    api,
  });

  // If the relay parent calculation matches, use the relay parent number
  if (pure === pureAccountRelayParent) {
    return relayParentNumber;
  }

  // If neither works, throw an error
  throw new Error(
    `Who ${spawner} is not the pure account ${pureAccount} or the pure account relay parent ${pureAccountRelayParent}`,
  );
}

export const proxiedWalletService = {
  findPureBlockNumber,
};
