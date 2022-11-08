import { ApiPromise } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';
import { construct, getRegistry, methods, GetRegistryOpts } from '@substrate/txwrapper-polkadot';

import { ITransactionService, Transaction, TransactionType } from './common/types';

export const useTransaction = (): ITransactionService => {
  const createMetaInfo = async (transaction: Transaction, api: ApiPromise) => {
    const { address } = transaction;

    const { block } = await api.rpc.chain.getBlock();
    const blockHash = await api.rpc.chain.getBlockHash();
    const genesisHash = await api.rpc.chain.getBlockHash(0);
    const metadataRpc = await api.rpc.state.getMetadata();
    const { specVersion, transactionVersion, specName } = await api.rpc.state.getRuntimeVersion();

    const registry = getRegistry({
      chainName: specName.toString() as GetRegistryOpts['specName'],
      specName: specName.toString() as GetRegistryOpts['specName'],
      specVersion: specVersion.toNumber(),
      metadataRpc: metadataRpc.toHex(),
    });

    const { nonce } = await api.query.system.account(address);
    const info = {
      address: address,
      blockHash: blockHash.toString(),
      blockNumber: block.header.number.toNumber(),
      eraPeriod: 64,
      genesisHash: genesisHash.toString(),
      metadataRpc: metadataRpc.toHex(),
      nonce: nonce.toNumber(),
      specVersion: specVersion.toNumber(),
      tip: 0,
      transactionVersion: transactionVersion.toNumber(),
    };

    const options = {
      metadataRpc: metadataRpc.toHex(),
      registry,
    };

    return {
      info,
      options,
      registry,
    };
  };

  const UnsignedTransaactions: Record<TransactionType, (args: Record<string, any>, info: any, options: any) => any> = {
    [TransactionType.TRANSFER]: (transaction, info, options) => {
      return methods.balances.transfer(
        {
          dest: transaction.args.dest,
          value: transaction.args.value,
        },
        info,
        options,
      );
    },
  };

  const createPayload = async (transaction: Transaction, api: ApiPromise) => {
    const { info, options, registry } = await createMetaInfo(transaction, api);

    const unsigned = UnsignedTransaactions[transaction.type](transaction, info, options);

    const signingPayloadHex = construct.signingPayload(unsigned, {
      registry,
    });

    return hexToU8a(signingPayloadHex);
  };

  return {
    createPayload,
  };
};
