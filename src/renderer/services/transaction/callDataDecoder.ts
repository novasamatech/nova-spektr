import { ApiPromise } from '@polkadot/api';
import { Call } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { HexString } from '@polkadot/util/types';
import { Type } from '@polkadot/types';

import { Address, CallData } from '@renderer/domain/shared-kernel';
import { DecodedTransaction, TransactionType } from '@renderer/domain/transaction';
import { BOND_WITH_CONTROLLER_ARGS_AMOUNT, OLD_MULTISIG_ARGS_AMOUNT } from './common/constants';
import { ICallDataDecoder } from './common/types';

export const useCallDataDecoder = (): ICallDataDecoder => {
  const decodeCallData = (api: ApiPromise, address: Address, callData: CallData): DecodedTransaction => {
    let extrinsicCall: Call;
    let decoded: SubmittableExtrinsic<'promise'> | null = null;

    try {
      decoded = api.tx(callData);
      extrinsicCall = api.createType('Call', decoded.method);
    } catch {
      extrinsicCall = api.createType('Call', callData);
    }
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);
    const extrinsicFn = api.tx[section][method];
    const extrinsic = extrinsicFn(...extrinsicCall.args);
    if (!decoded) {
      decoded = extrinsic;
    }
    if (isBatchExtrinsic(method, section)) {
      return parseBatch(method, section, address, decoded, api);
    }

    return parseSingle(method, section, address, decoded, api.genesisHash.toHex());
  };

  const parseBatch = (
    method: string,
    section: string,
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    api: ApiPromise,
  ): DecodedTransaction => {
    let transactionType: TransactionType | undefined = undefined;
    if (method === 'batchAll' && section === 'utility') {
      transactionType = TransactionType.BATCH_ALL;
    }

    const batchTransaction = getDecodedTransaction(
      address,
      decoded,
      method,
      section,
      api.genesisHash.toHex(),
      transactionType,
    );
    const calls = api.createType('Vec<Call>', batchTransaction.args.calls);
    batchTransaction.args.transactions = calls.map((call) => decodeCallData(api, address, call.toHex()));

    return batchTransaction;
  };

  const parseSingle = (
    method: string,
    section: string,
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    genesisHash: HexString,
  ): DecodedTransaction => {
    console.log(`Start parsing call data for section ${section} and method ${method}`);

    const transactionType = getTransactionType(method, section);

    return getDecodedTransaction(address, decoded, method, section, genesisHash, transactionType);
  };

  const getDecodedTransaction = (
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    method: string,
    section: string,
    genesisHash: HexString,
    transactionType?: TransactionType,
  ): DecodedTransaction => {
    if (!transactionType) {
      throw new Error(`Transaction type ${transactionType} is absent for ${method} & ${section}`);
    }

    const parser = getCallDataParser[transactionType];
    if (!parser) {
      throw new Error(`Unknown call data parser for transaction type ${transactionType}`);
    }

    return {
      address,
      method,
      section,
      chainId: genesisHash,
      args: parser(method, section, decoded),
      type: transactionType,
    };
  };

  const getCallDataParser: Record<
    TransactionType,
    (method: string, section: string, decoded: SubmittableExtrinsic<'promise'>) => Record<string, any>
  > = {
    [TransactionType.TRANSFER]: (method, section, decoded): Record<string, any> => {
      return { dest: decoded.args[0].toString(), value: decoded.args[1].toString() };
    },
    [TransactionType.ASSET_TRANSFER]: (method, section, decoded): Record<string, any> => {
      return {
        assetId: decoded.args[0].toString(),
        dest: decoded.args[1].toString(),
        value: decoded.args[2].toString(),
      };
    },
    [TransactionType.ORML_TRANSFER]: (method, section, decoded): Record<string, any> => {
      return {
        dest: decoded.args[0].toString(),
        assetId: decoded.args[1].toString(),
        value: decoded.args[2].toString(),
      };
    },
    [TransactionType.BOND]: (method, section, decoded): Record<string, any> => {
      const args: Record<string, any> = {};
      let index = 0;
      if (decoded.args.length === BOND_WITH_CONTROLLER_ARGS_AMOUNT) {
        args.controller = decoded.args[index++].toString();
      }

      args.value = decoded.args[index++].toString();
      let payee = decoded.args[index++].toString();

      try {
        payee = JSON.parse(payee);
      } catch (e) {
        console.warn(e);
      }
      args.payee = payee;

      return args;
    },
    [TransactionType.UNSTAKE]: (method, section, decoded): Record<string, any> => {
      return { value: decoded.args[0].toString() };
    },
    [TransactionType.CHILL]: (): Record<string, any> => {
      return {};
    },
    [TransactionType.RESTAKE]: (method, section, decoded): Record<string, any> => {
      return { value: decoded.args[0].toString() };
    },
    [TransactionType.REDEEM]: (): Record<string, any> => {
      return {};
    },
    [TransactionType.NOMINATE]: (method, section, decoded): Record<string, any> => {
      return { targets: (decoded.args[0] as any).map((a: Type) => a.toString()) };
    },
    [TransactionType.STAKE_MORE]: (method, section, decoded): Record<string, any> => {
      return { maxAdditional: decoded.args[0].toString() };
    },
    [TransactionType.DESTINATION]: (method, section, decoded): Record<string, any> => {
      const args: Record<string, any> = {};
      try {
        args.payee = JSON.parse(decoded.args[0].toString());
      } catch (e) {
        console.warn(e);
        args.payee = decoded.args[0].toString();
      }

      return args;
    },
    [TransactionType.BATCH_ALL]: (method, section, decoded): Record<string, any> => {
      return { calls: decoded.args[0].toHex() };
    },
    [TransactionType.MULTISIG_AS_MULTI]: (method, section, decoded): Record<string, any> => {
      if (decoded.args.length === OLD_MULTISIG_ARGS_AMOUNT) {
        return {
          threshold: decoded.args[0],
          otherSignatories: decoded.args[1],
          timepoint: decoded.args[2],
          call: decoded.args[3],
          storeCall: decoded.args[4],
          maxWeight: decoded.args[5],
        };
      }

      return {
        threshold: decoded.args[0],
        otherSignatories: decoded.args[1],
        timepoint: decoded.args[2],
        call: decoded.args[3],
        maxWeight: decoded.args[4],
      };
    },
    [TransactionType.MULTISIG_APPROVE_AS_MULTI]: (method, section, decoded): Record<string, any> => {
      return {
        threshold: decoded.args[0],
        otherSignatories: decoded.args[1],
        timepoint: decoded.args[2],
        callHash: decoded.args[3],
        maxWeight: decoded.args[4],
      };
    },
    [TransactionType.MULTISIG_CANCEL_AS_MULTI]: (method, section, decoded): Record<string, any> => {
      return {
        threshold: decoded.args[0],
        otherSignatories: decoded.args[1],
        timepoint: decoded.args[2],
        callHash: decoded.args[3],
      };
    },
  };

  const isBatchExtrinsic = (method: string, section: string): boolean => {
    return section === 'utility' && method === 'batchAll';
  };

  const getTransactionType = (method: string, section: string): TransactionType | undefined => {
    const TRANSFER_METHODS = ['transfer', 'transferKeepAlive', 'transferAllowDeath'];

    if (TRANSFER_METHODS.includes(method) && section === 'balances') return TransactionType.TRANSFER;
    if (TRANSFER_METHODS.includes(method) && section === 'assets') return TransactionType.ASSET_TRANSFER;
    if (method === 'transfer' && (section === 'currencies' || section === 'tokens'))
      return TransactionType.ORML_TRANSFER;

    if (section !== 'staking') return undefined;

    if (method === 'bond') return TransactionType.BOND;
    if (method === 'unbond') return TransactionType.UNSTAKE;
    if (method === 'chill') return TransactionType.CHILL;
    if (method === 'rebond') return TransactionType.RESTAKE;
    if (method === 'withdrawUnbonded') return TransactionType.REDEEM;
    if (method === 'nominate') return TransactionType.NOMINATE;
    if (method === 'bondExtra') return TransactionType.STAKE_MORE;
    if (method === 'setPayee') return TransactionType.DESTINATION;

    return undefined;
  };

  return { decodeCallData };
};
