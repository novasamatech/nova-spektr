import { ApiPromise } from '@polkadot/api';
import { BaseTxInfo, getRegistry, GetRegistryOpts, OptionsWithMeta, TypeRegistry } from '@substrate/txwrapper-polkadot';

import { AccountID } from '@renderer/domain/shared-kernel';

/**
 * Compose and return all the data needed for @substrate/txwrapper-polkadot signing
 * @param accountId account identification
 * @param api polkadot connector
 */
export const createTxMetadata = async (
  accountId: AccountID,
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
