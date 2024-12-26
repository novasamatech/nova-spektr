import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type Type } from '@polkadot/types';
import { type Call } from '@polkadot/types/interfaces';
import { type HexString } from '@polkadot/util/types';

import { xcmService } from '@/shared/api/xcm';
import { type Address, type CallData, type ChainId, type DecodedTransaction, TransactionType } from '@/shared/core';

import {
  BOND_WITH_CONTROLLER_ARGS_AMOUNT,
  GOVERNANCE_SECTION,
  MULTISIG_SECTION,
  OLD_MULTISIG_ARGS_AMOUNT,
  PROXY_SECTION,
  STAKING_SECTION,
  TRANSFER_SECTIONS,
  XCM_SECTIONS,
} from './common/constants';
import { type ICallDataDecoder } from './common/types';

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

    if (isProxyExtrinsic(method, section)) {
      return parseProxy(method, section, address, decoded, api);
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

  const parseProxy = (
    method: string,
    section: string,
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    api: ApiPromise,
  ): DecodedTransaction => {
    const proxyTransaction = getDecodedTransaction(
      address,
      decoded,
      method,
      section,
      api.genesisHash.toHex(),
      TransactionType.PROXY,
    );
    const call = api.createType('Call', proxyTransaction.args.call);
    proxyTransaction.args.transaction = decodeCallData(api, address, call.toHex());

    return proxyTransaction;
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

    const additionalArgs: Record<string, unknown> = {};

    if (section.endsWith('Collective')) {
      transactionType = TransactionType.COLLECTIVE_VOTE;
      additionalArgs['pallet'] = section.replace('Collective', '');
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
      args: {
        ...additionalArgs,
        ...parser(decoded, genesisHash),
      },
      type: transactionType,
    };
  };

  const getCallDataParser: Record<
    TransactionType,
    (decoded: SubmittableExtrinsic<'promise'>, chainId: ChainId) => Record<string, any>
  > = {
    [TransactionType.TRANSFER]: (decoded): Record<string, any> => {
      return { dest: decoded.args[0].toString(), value: decoded.args[1].toString() };
    },
    [TransactionType.ASSET_TRANSFER]: (decoded): Record<string, any> => {
      return {
        assetId: decoded.args[0].toString(),
        dest: decoded.args[1].toString(),
        value: decoded.args[2].toString(),
      };
    },
    [TransactionType.ORML_TRANSFER]: (decoded): Record<string, any> => {
      return {
        dest: decoded.args[0].toString(),
        assetId: decoded.args[1].toString(),
        value: decoded.args[2].toString(),
      };
    },
    [TransactionType.XCM_LIMITED_TRANSFER]: (decoded, chainId): Record<string, any> => {
      const parsedData = xcmService.parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return xcmService.decodeXcm(chainId, parsedData);
    },
    [TransactionType.XCM_TELEPORT]: (decoded, chainId): Record<string, any> => {
      const parsedData = xcmService.parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return xcmService.decodeXcm(chainId, parsedData);
    },
    [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: (decoded, chainId): Record<string, any> => {
      const parsedData = xcmService.parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return xcmService.decodeXcm(chainId, parsedData);
    },
    [TransactionType.POLKADOT_XCM_TELEPORT]: (decoded, chainId): Record<string, any> => {
      const parsedData = xcmService.parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return xcmService.decodeXcm(chainId, parsedData);
    },
    [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: (decoded, chainId): Record<string, any> => {
      const parsedData = xcmService.parseXcmPalletExtrinsic({
        dest: decoded.args[0].toHuman(),
        beneficiary: decoded.args[1].toHuman(),
        assets: decoded.args[2].toHuman(),
      });

      return xcmService.decodeXcm(chainId, parsedData);
    },
    [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: (decoded, chainId): Record<string, any> => {
      const parsedData = xcmService.parseXTokensExtrinsic({
        asset: decoded.args[0].toHuman(),
        dest: decoded.args[1].toHuman(),
      });

      return xcmService.decodeXcm(chainId, parsedData);
    },
    [TransactionType.BOND]: (decoded): Record<string, any> => {
      const args: Record<string, any> = {};
      let index = 0;
      if (decoded.args.length === BOND_WITH_CONTROLLER_ARGS_AMOUNT) {
        args.controller = decoded.args[index++].toString();
      }

      args.value = decoded.args[index++].toString();
      const payee = decoded.args[index++].toString();

      try {
        args.payee = JSON.parse(payee);
      } catch (e) {
        args.payee = payee;
        console.warn(e);
      }

      if (typeof args.payee === 'object') {
        args.payee = { Account: Object.values(args.payee)[0] };
      }

      return args;
    },
    [TransactionType.UNSTAKE]: (decoded): Record<string, any> => {
      return { value: decoded.args[0].toString() };
    },
    [TransactionType.CHILL]: (): Record<string, any> => {
      return {};
    },
    [TransactionType.RESTAKE]: (decoded): Record<string, any> => {
      return { value: decoded.args[0].toString() };
    },
    [TransactionType.REDEEM]: (): Record<string, any> => {
      return {};
    },
    [TransactionType.NOMINATE]: (decoded): Record<string, any> => {
      return { targets: (decoded.args[0] as any).map((a: Type) => a.toString()) };
    },
    [TransactionType.STAKE_MORE]: (decoded): Record<string, any> => {
      return { maxAdditional: decoded.args[0].toString() };
    },
    [TransactionType.DESTINATION]: (decoded): Record<string, any> => {
      const args: Record<string, any> = {};
      try {
        args.payee = JSON.parse(decoded.args[0].toString());
      } catch (e) {
        console.warn(e);
        args.payee = decoded.args[0].toString();
      }

      if (typeof args.payee === 'object') {
        args.payee = { Account: Object.values(args.payee)[0] };
      }

      return args;
    },
    [TransactionType.BATCH_ALL]: (decoded): Record<string, any> => {
      return { calls: decoded.args[0].toHex() };
    },
    [TransactionType.MULTISIG_AS_MULTI]: (decoded): Record<string, any> => {
      const baseParams = {
        threshold: decoded.args[0].toString(),
        otherSignatories: decoded.args[1].toHuman(),
        timepoint: decoded.args[2].toString(),
        call: decoded.args[3].toHex(),
      };

      if (decoded.args.length === OLD_MULTISIG_ARGS_AMOUNT) {
        return {
          ...baseParams,
          storeCall: decoded.args[4].toString(),
          maxWeight: decoded.args[5].toString(),
        };
      }

      return {
        ...baseParams,
        maxWeight: decoded.args[4].toHuman(),
      };
    },
    [TransactionType.MULTISIG_APPROVE_AS_MULTI]: (decoded): Record<string, any> => {
      return {
        threshold: decoded.args[0].toString(),
        otherSignatories: decoded.args[1].toHuman(),
        timepoint: decoded.args[2].toString(),
        callHash: decoded.args[3].toHex(),
        maxWeight: decoded.args[4].toHuman(),
      };
    },
    [TransactionType.MULTISIG_CANCEL_AS_MULTI]: (decoded): Record<string, any> => {
      return {
        threshold: decoded.args[0].toString(),
        otherSignatories: decoded.args[1].toHuman(),
        timepoint: decoded.args[2].toString(),
        callHash: decoded.args[3].toHex(),
      };
    },
    [TransactionType.ADD_PROXY]: (decoded): Record<string, any> => {
      return {
        delegate: decoded.args[0].toString(),
        proxyType: decoded.args[1].toString(),
        delay: decoded.args[2].toString(),
      };
    },
    [TransactionType.CREATE_PURE_PROXY]: (decoded): Record<string, any> => {
      return {
        proxyType: decoded.args[0].toString(),
        delay: decoded.args[1].toString(),
        index: decoded.args[2].toString(),
      };
    },
    [TransactionType.REMOVE_PROXY]: (decoded): Record<string, any> => {
      return {
        delegate: decoded.args[0].toString(),
        proxyType: decoded.args[1].toString(),
        delay: decoded.args[2].toString(),
      };
    },
    [TransactionType.REMOVE_PURE_PROXY]: (decoded): Record<string, any> => {
      return {
        spawner: decoded.args[0].toString(),
        proxyType: decoded.args[1].toString(),
        index: decoded.args[2].toString(),
        height: decoded.args[3].toString(),
        extIndex: decoded.args[4].toString(),
      };
    },
    [TransactionType.PROXY]: (decoded): Record<string, any> => {
      return {
        real: decoded.args[0].toString(),
        forceProxyType: decoded.args[1].toString(),
        call: decoded.args[2].toHex(),
      };
    },
    [TransactionType.REMARK]: (decoded): Record<string, any> => {
      return { remark: decoded.args[0].toString() };
    },
    [TransactionType.UNLOCK]: (decoded): Record<string, any> => {
      return {
        class: decoded.args[0].toString(),
        target: decoded.args[1].toString(),
      };
    },
    [TransactionType.VOTE]: (decoded): Record<string, any> => {
      return {
        referendum: decoded.args[0].toString(),
        vote: decoded.args[1].toHuman(),
      };
    },
    [TransactionType.REVOTE]: (decoded): Record<string, any> => {
      return {
        referendum: decoded.args[0].toString(),
        vote: decoded.args[1].toHuman(),
      };
    },
    [TransactionType.REMOVE_VOTE]: (decoded): Record<string, any> => {
      return {
        track: decoded.args[0].toString(),
        referendum: decoded.args[1].toString(),
      };
    },
    [TransactionType.UNDELEGATE]: (decoded): Record<string, any> => {
      return {
        track: decoded.args[0].toString(),
      };
    },
    [TransactionType.DELEGATE]: (decoded): Record<string, any> => {
      return {
        track: decoded.args[0].toString(),
        target: decoded.args[1].toString(),
        conviction: decoded.args[2].toString(),
        balance: decoded.args[3].toString(),
      };
    },
    [TransactionType.EDIT_DELEGATION]: (decoded): Record<string, any> => {
      return {
        track: decoded.args[0].toString(),
        target: decoded.args[1].toString(),
        conviction: decoded.args[2].toString(),
        balance: decoded.args[3].toString(),
      };
    },
    [TransactionType.COLLECTIVE_VOTE]: (decoded): Record<string, any> => {
      return {
        pool: decoded.args[0].toString(),
        aye: decoded.args[1].toPrimitive(),
      };
    },
  };

  const isBatchExtrinsic = (method: string, section: string): boolean => {
    return section === 'utility' && method === 'batchAll';
  };

  const isProxyExtrinsic = (method: string, section: string): boolean => {
    return section === 'proxy' && method === 'proxy';
  };

  const getTransactionType = (method: string, section: string): TransactionType | undefined => {
    const transferType = getTransferTxType(method, section);
    const stakingType = getStakingTxType(method, section);
    const xcmType = getXcmTxType(method, section);
    const proxyType = getProxyTxType(method, section);
    const multisigType = getMultisigTxType(method, section);
    const governanceType = getGovernanceTxType(method, section);
    const collectiveType = getCollectiveTxType(method, section);

    return transferType || stakingType || xcmType || proxyType || multisigType || governanceType || collectiveType;
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

  const getProxyTxType = (method: string, section: string): TransactionType | undefined => {
    if (PROXY_SECTION !== section) return;

    return {
      addProxy: TransactionType.ADD_PROXY,
      removeProxy: TransactionType.REMOVE_PROXY,
      proxy: TransactionType.PROXY,
      createPure: TransactionType.CREATE_PURE_PROXY,
      killPure: TransactionType.REMOVE_PURE_PROXY,
    }[method];
  };

  const getMultisigTxType = (method: string, section: string): TransactionType | undefined => {
    if (MULTISIG_SECTION !== section) return;

    return {
      asMulti: TransactionType.MULTISIG_AS_MULTI,
      approveAsMulti: TransactionType.MULTISIG_APPROVE_AS_MULTI,
      cancelAsMulti: TransactionType.MULTISIG_CANCEL_AS_MULTI,
    }[method];
  };

  const getGovernanceTxType = (method: string, section: string): TransactionType | undefined => {
    if (GOVERNANCE_SECTION !== section) return;

    return {
      removeVote: TransactionType.REMOVE_VOTE,
      vote: TransactionType.VOTE,
      unlock: TransactionType.UNLOCK,
      revote: TransactionType.REVOTE,
      delegate: TransactionType.DELEGATE,
      undelegate: TransactionType.UNDELEGATE,
    }[method];
  };

  const getCollectiveTxType = (method: string, section: string): TransactionType | undefined => {
    if (!section.endsWith('Collective')) return;

    return {
      vote: TransactionType.COLLECTIVE_VOTE,
    }[method];
  };

  return { decodeCallData, getTxFromCallData };
};
