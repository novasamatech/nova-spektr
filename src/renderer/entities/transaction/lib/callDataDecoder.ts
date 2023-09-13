import { ApiPromise } from '@polkadot/api';
import { Call } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { HexString } from '@polkadot/util/types';
import { Type } from '@polkadot/types';

import { parseXcmPalletExtrinsic, parseXTokensExtrinsic, decodeXcm } from '@renderer/shared/api/xcm';
import { Address, CallData, ChainId } from '@renderer/domain/shared-kernel';
import { DecodedTransaction, TransactionType } from '@renderer/entities/transaction/model/transaction';
import { ICallDataDecoder } from './common/types';
import {
  BOND_WITH_CONTROLLER_ARGS_AMOUNT,
  OLD_MULTISIG_ARGS_AMOUNT,
  TRANSFER_SECTIONS,
  STAKING_SECTION,
  XCM_SECTIONS,
} from './common/constants';

export const useCallDataDecoder = (): ICallDataDecoder => {
  const getDataFromCallData = (
    api: ApiPromise,
    callData: CallData,
  ): {
    decoded: SubmittableExtrinsic<'promise'>;
    method: string;
    section: string;
  } => {
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

    return { decoded, method, section };
  };

  const getTxFromCallData = (api: ApiPromise, callData: CallData): SubmittableExtrinsic<'promise'> => {
    return getDataFromCallData(api, callData).decoded;
  };

  const decodeCallData = (api: ApiPromise, address: Address, callData: CallData): DecodedTransaction => {
    const { decoded, method, section } = getDataFromCallData(api, callData);

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
    let transactionType: TransactionType | undefined;
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
      console.log(`Unknown transaction type with section ${section} and method ${method}`);

      return {
        address,
        method,
        section,
        chainId: genesisHash,
        args: {},
        type: transactionType,
      };
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
      args: parser(decoded, genesisHash),
      type: transactionType,
    };
  };

  const getCallDataParser: Record<
    TransactionType,
    (decoded: SubmittableExtrinsic<'promise'>, chainId: ChainId) => Record<string, any>
  > = {
    [TransactionType.TRANSFER]: (decoded, chainId): Record<string, any> => {
      return { dest: decoded.args[0].toString(), value: decoded.args[1].toString() };
    },
    [TransactionType.ASSET_TRANSFER]: (decoded, chainId): Record<string, any> => {
      return {
        assetId: decoded.args[0].toString(),
        dest: decoded.args[1].toString(),
        value: decoded.args[2].toString(),
      };
    },
    [TransactionType.ORML_TRANSFER]: (decoded, chainId): Record<string, any> => {
      return {
        dest: decoded.args[0].toString(),
        assetId: decoded.args[1].toString(),
        value: decoded.args[2].toString(),
      };
    },
    [TransactionType.XCM_LIMITED_TRANSFER]: (decoded, chainId): Record<string, any> => {
      const parsedData = parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return decodeXcm(chainId, parsedData);
    },
    [TransactionType.XCM_TELEPORT]: (decoded, chainId): Record<string, any> => {
      const parsedData = parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return decodeXcm(chainId, parsedData);
    },
    [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: (decoded, chainId): Record<string, any> => {
      const parsedData = parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return decodeXcm(chainId, parsedData);
    },
    [TransactionType.POLKADOT_XCM_TELEPORT]: (decoded, chainId): Record<string, any> => {
      const parsedData = parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return decodeXcm(chainId, parsedData);
    },
    [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: (decoded, chainId): Record<string, any> => {
      const parsedData = parseXTokensExtrinsic({
        asset: decoded.args[0].toHuman(),
        dest: decoded.args[1].toHuman(),
      });

      return decodeXcm(chainId, parsedData);
    },
    [TransactionType.BOND]: (decoded, chainId): Record<string, any> => {
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
    [TransactionType.UNSTAKE]: (decoded, chainId): Record<string, any> => {
      return { value: decoded.args[0].toString() };
    },
    [TransactionType.CHILL]: (): Record<string, any> => {
      return {};
    },
    [TransactionType.RESTAKE]: (decoded, chainId): Record<string, any> => {
      return { value: decoded.args[0].toString() };
    },
    [TransactionType.REDEEM]: (): Record<string, any> => {
      return {};
    },
    [TransactionType.NOMINATE]: (decoded, chainId): Record<string, any> => {
      return { targets: (decoded.args[0] as any).map((a: Type) => a.toString()) };
    },
    [TransactionType.STAKE_MORE]: (decoded, chainId): Record<string, any> => {
      return { maxAdditional: decoded.args[0].toString() };
    },
    [TransactionType.DESTINATION]: (decoded, chainId): Record<string, any> => {
      const args: Record<string, any> = {};
      try {
        args.payee = JSON.parse(decoded.args[0].toString());
      } catch (e) {
        console.warn(e);
        args.payee = decoded.args[0].toString();
      }

      return args;
    },
    [TransactionType.BATCH_ALL]: (decoded, chainId): Record<string, any> => {
      return { calls: decoded.args[0].toHex() };
    },
    [TransactionType.MULTISIG_AS_MULTI]: (decoded, chainId): Record<string, any> => {
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
    [TransactionType.MULTISIG_APPROVE_AS_MULTI]: (decoded, chainId): Record<string, any> => {
      return {
        threshold: decoded.args[0],
        otherSignatories: decoded.args[1],
        timepoint: decoded.args[2],
        callHash: decoded.args[3],
        maxWeight: decoded.args[4],
      };
    },
    [TransactionType.MULTISIG_CANCEL_AS_MULTI]: (decoded, chainId): Record<string, any> => {
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
    const transferType = getTransferTxType(method, section);
    const stakingType = getStakingTxType(method, section);
    const xcmType = getXcmTxType(method, section);

    return transferType || stakingType || xcmType;
  };

  const getTransferTxType = (method: string, section: string): TransactionType | undefined => {
    if (!TRANSFER_SECTIONS.includes(section)) return;

    const TRANSFER_METHODS = ['transfer', 'transferKeepAlive', 'transferAllowDeath'];

    if (TRANSFER_METHODS.includes(method) && section === 'balances') return TransactionType.TRANSFER;
    if (TRANSFER_METHODS.includes(method) && section === 'assets') return TransactionType.ASSET_TRANSFER;
    if (method === 'transfer') return TransactionType.ORML_TRANSFER;

    return undefined;
  };

  const getStakingTxType = (method: string, section: string): TransactionType | undefined => {
    if (!STAKING_SECTION.includes(section)) return;

    return {
      bond: TransactionType.BOND,
      unbond: TransactionType.UNSTAKE,
      chill: TransactionType.CHILL,
      rebond: TransactionType.RESTAKE,
      withdrawUnbonded: TransactionType.REDEEM,
      nominate: TransactionType.NOMINATE,
      bondExtra: TransactionType.STAKE_MORE,
      setPayee: TransactionType.DESTINATION,
    }[method];
  };

  const getXcmTxType = (method: string, section: string): TransactionType | undefined => {
    if (!XCM_SECTIONS.includes(section)) return;

    if (section === 'xcmPallet') {
      return {
        limitedReserveTransferAssets: TransactionType.XCM_LIMITED_TRANSFER,
        limitedTeleportAssets: TransactionType.XCM_TELEPORT,
      }[method];
    }

    if (section === 'polkadotXcm') {
      return {
        limitedReserveTransferAssets: TransactionType.POLKADOT_XCM_LIMITED_TRANSFER,
        limitedTeleportAssets: TransactionType.POLKADOT_XCM_TELEPORT,
      }[method];
    }

    if (method === 'transferMultiasset' && section === 'xTokens') {
      return TransactionType.XTOKENS_TRANSFER_MULTIASSET;
    }

    return undefined;
  };

  return { decodeCallData, getTxFromCallData };
};
