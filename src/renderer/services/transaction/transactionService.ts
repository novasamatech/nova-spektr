import { ApiPromise } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';
import { BaseTxInfo, construct, methods, OptionsWithMeta, UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { createTxMetadata } from '@renderer/utils/substrate';
import { ITransactionService, Transaction, TransactionType } from './common/types';

export const useTransaction = (): ITransactionService => {
  const getUnsignedTransaction: Record<
    TransactionType,
    (args: Record<string, any>, info: BaseTxInfo, options: OptionsWithMeta) => UnsignedTransaction
  > = {
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

  const createPayload = async (transaction: Transaction, api: ApiPromise): Promise<Uint8Array> => {
    const { info, options, registry } = await createTxMetadata(transaction.address, api);

    const unsigned = getUnsignedTransaction[transaction.type](transaction, info, options);
    const signingPayloadHex = construct.signingPayload(unsigned, { registry });

    return hexToU8a(signingPayloadHex);
  };

  return {
    createPayload,
  };
};
