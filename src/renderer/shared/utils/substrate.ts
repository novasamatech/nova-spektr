import { ApiPromise } from '@polkadot/api';
import { BaseTxInfo, getRegistry, GetRegistryOpts, OptionsWithMeta, TypeRegistry } from '@substrate/txwrapper-polkadot';
import { isHex, hexToU8a } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';

import { Address, CallData, CallHash } from '@renderer/domain/shared-kernel';

/**
 * Compose and return all the data needed for @substrate/txwrapper-polkadot signing
 * @param accountId account identification
 * @param api polkadot connector
 */
export const createTxMetadata = async (
  accountId: Address,
  api: ApiPromise,
): Promise<{ registry: TypeRegistry; options: OptionsWithMeta; info: BaseTxInfo }> => {
  const { block } = await api.rpc.chain.getBlock();
  const blockHash = await api.rpc.chain.getBlockHash();
  const genesisHash = await api.rpc.chain.getBlockHash(0);
  const metadataRpc = await api.rpc.state.getMetadata();
  const { nonce } = await api.query.system.account(accountId);
  const { specVersion, transactionVersion, specName } = await api.rpc.state.getRuntimeVersion();

  const registry = getRegistry({
    chainName: specName.toString() as GetRegistryOpts['specName'],
    specName: specName.toString() as GetRegistryOpts['specName'],
    specVersion: specVersion.toNumber(),
    metadataRpc: metadataRpc.toHex(),
  });

  const info: BaseTxInfo = {
    address: accountId,
    blockHash: blockHash.toString(),
    blockNumber: block.header.number.toNumber(),
    genesisHash: genesisHash.toString(),
    metadataRpc: metadataRpc.toHex(),
    nonce: nonce.toNumber(),
    specVersion: specVersion.toNumber(),
    transactionVersion: transactionVersion.toNumber(),
    eraPeriod: 64,
    tip: 0,
  };

  const options: OptionsWithMeta = { metadataRpc: metadataRpc.toHex(), registry };

  return { options, info, registry };
};

/**
 * Check that callData correctly resembles callHash
 * @param callHash callHash value
 * @param callData callData value
 * @return {Boolean}
 */
export const validateCallData = <T extends string = CallData, K extends string = CallHash>(
  callData: T,
  callHash: K,
): boolean => {
  return isHex(callData) && callHash === blake2AsHex(hexToU8a(callData));
};
