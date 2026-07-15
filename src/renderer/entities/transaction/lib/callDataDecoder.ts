import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type Type } from '@polkadot/types';
import { type Call } from '@polkadot/types/interfaces';
import { type HexString } from '@polkadot/util/types';

import { type CallData, type ChainId, type DecodedTransaction, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import {
  BOND_WITH_CONTROLLER_ARGS_AMOUNT,
  GOVERNANCE_SECTION,
  MULTISIG_SECTION,
  OLD_MULTISIG_ARGS_AMOUNT,
  PROXY_SECTION,
  STAKING_SECTION,
  SYSTEM_SECTION,
  TRANSFER_SECTIONS,
  VESTING_SECTION,
  XCM_SECTIONS,
} from './common/constants';

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
    if (decoded.toHex() !== callData) {
      throw new Error('Cannot decode data as extrinsic, length mismatch');
    }

    extrinsicCall = api.createType('Call', decoded.method);
  } catch {
    extrinsicCall = api.createType('Call', callData);
  }

  const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);

  const extrinsicFn = api.tx[section]?.[method];
  if (!extrinsicFn) {
    throw new Error(`Unknown extrinsic: ${section}.${method}`);
  }
  const extrinsic = extrinsicFn(...extrinsicCall.args);

  if (!decoded) {
    decoded = extrinsic;
  }

  return { decoded, method, section };
};

export const getTxFromCallData = (api: ApiPromise, callData: CallData): SubmittableExtrinsic<'promise'> => {
  return getDataFromCallData(api, callData).decoded;
};

/**
 * Extracts only the outer pallet/method names from raw callData. Unlike
 * `decodeCallData`, this never builds the SubmittableExtrinsic and never
 * recurses into batch/proxy children — so a missing inner-call type or a
 * runtime metadata mismatch on a nested call does not poison the result.
 *
 * Returns null only when the local API genuinely doesn't know the outer
 * pallet/call index (e.g. callData was emitted under a different runtime).
 */
export const extractSectionMethodFromCallData = (
  api: ApiPromise,
  callData: CallData,
): { section: string; method: string } | null => {
  try {
    const call = api.createType('Call', callData);
    const { method, section } = api.registry.findMetaCall(call.callIndex);

    return { section, method };
  } catch {
    return null;
  }
};

export const decodeCallData = (
  api: ApiPromise,
  accountId: AccountId,
  callData: CallData,
  nativeAssetId: string,
): DecodedTransaction => {
  const { decoded, method, section } = getDataFromCallData(api, callData);

  if (isBatchExtrinsic(method, section)) {
    return parseBatch(method, section, accountId, decoded, api, nativeAssetId);
  }

  if (isProxyExtrinsic(method, section)) {
    return parseProxy(method, section, accountId, decoded, api, nativeAssetId);
  }

  return parseSingle(method, section, accountId, decoded, api.genesisHash.toHex(), nativeAssetId);
};

const parseBatch = (
  method: string,
  section: string,
  accountId: AccountId,
  decoded: SubmittableExtrinsic<'promise'>,
  api: ApiPromise,
  nativeAssetId: string,
): DecodedTransaction => {
  let transactionType: TransactionType | undefined;
  if (['batchAll', 'batch', 'forceBatch'].includes(method) && section === 'utility') {
    transactionType = TransactionType.BATCH_ALL;
  }

  const calls = api.createType('Vec<Call>', decoded.args[0]);
  const innerTransactions = calls.map((call) => decodeCallData(api, accountId, call.toHex(), nativeAssetId));
  const firstTx = innerTransactions[0];
  const isProxy = firstTx?.section === 'proxy' && firstTx?.method === 'proxy';
  const proxiedAccountId = isProxy && firstTx?.accountId ? firstTx?.accountId : accountId;

  const batchTransaction = getDecodedTransaction(
    proxiedAccountId,
    decoded,
    method,
    section,
    api.genesisHash.toHex(),
    nativeAssetId,
    transactionType,
  );
  batchTransaction.args.transactions = innerTransactions;

  return batchTransaction;
};

const parseProxy = (
  method: string,
  section: string,
  accountId: AccountId,
  decoded: SubmittableExtrinsic<'promise'>,
  api: ApiPromise,
  nativeAssetId: string,
): DecodedTransaction => {
  const proxiedAccountId = (decoded.args[0] && toAccountId(decoded.args[0].toString())) ?? accountId;

  const proxyTransaction = getDecodedTransaction(
    proxiedAccountId,
    decoded,
    method,
    section,
    api.genesisHash.toHex(),
    nativeAssetId,
    TransactionType.PROXY,
  );
  const call = api.createType('Call', proxyTransaction.args.call);
  proxyTransaction.args.transaction = decodeCallData(api, proxiedAccountId, call.toHex(), nativeAssetId);

  return proxyTransaction;
};

const parseSingle = (
  method: string,
  section: string,
  accountId: AccountId,
  decoded: SubmittableExtrinsic<'promise'>,
  genesisHash: HexString,
  nativeAssetId: string,
): DecodedTransaction => {
  const transactionType = getTransactionType(method, section);
  return getDecodedTransaction(accountId, decoded, method, section, genesisHash, nativeAssetId, transactionType);
};

const getDecodedTransaction = (
  accountId: AccountId,
  decoded: SubmittableExtrinsic<'promise'>,
  method: string,
  section: string,
  genesisHash: HexString,
  nativeAssetId: string,
  transactionType?: TransactionType,
): DecodedTransaction => {
  if (!transactionType) {
    return {
      accountId,
      method,
      section,
      chainId: genesisHash,
      args: {},
      type: transactionType,
    };
  }

  const additionalArgs: Record<string, unknown> = {};

  if (section.endsWith('Collective')) {
    const pallet = section.replace('Collective', '');

    transactionType = ('collective_' + method) as TransactionType;
    additionalArgs['pallet'] = pallet;
  }

  if (section.endsWith('Core')) {
    const pallet = section.replace('Core', '');

    transactionType = ('collective_core_' + method) as TransactionType;
    additionalArgs['pallet'] = pallet;
  }

  const parser = getCallDataParser[transactionType];
  if (!parser) {
    throw new Error(`Unknown call data parser for transaction type ${transactionType}`);
  }

  return {
    accountId,
    method,
    section,
    chainId: genesisHash,
    args: {
      ...additionalArgs,
      ...parser(decoded, genesisHash, nativeAssetId),
    },
    type: transactionType,
  };
};

const getCallDataParser: Record<
  TransactionType,
  (decoded: SubmittableExtrinsic<'promise'>, chainId: ChainId, assetId: string) => Record<string, any>
> = {
  [TransactionType.TRANSFER]: (decoded, chainId, assetId): Record<string, any> => {
    return {
      assetId,
      dest: decoded.args[0]?.toString(),
      value: decoded.args[1]?.toString(),
    };
  },
  [TransactionType.TRANSFER_ALL]: (decoded, chainId, assetId): Record<string, any> => {
    return { assetId, dest: decoded.args[0]?.toString() };
  },
  [TransactionType.TRANSFER_ALLOW_DEATH]: (decoded, chainId, assetId): Record<string, any> => {
    return {
      assetId,
      dest: decoded.args[0]?.toString(),
      value: decoded.args[1]?.toString(),
    };
  },
  [TransactionType.VESTED_TRANSFER]: (decoded): Record<string, any> => {
    const schedule = decoded.args[1] as any;
    return {
      target: decoded.args[0]!.toString(),
      schedule: {
        locked: schedule.locked.toString(),
        perBlock: schedule.perBlock.toString(),
        startingBlock: schedule.startingBlock.toString(),
      },
    };
  },
  [TransactionType.VEST]: (): Record<string, any> => {
    return {};
  },
  [TransactionType.ASSET_TRANSFER]: (decoded): Record<string, any> => {
    return {
      assetId: decoded.args[0]!.toString(),
      dest: decoded.args[1]!.toString(),
      value: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.ORML_TRANSFER]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      assetId: decoded.args[1]!.toString(),
      value: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.XCM_LIMITED_TRANSFER]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      beneficiary: decoded.args[1]!.toString(),
      assets: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.XCM_TELEPORT]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      beneficiary: decoded.args[1]!.toString(),
      assets: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      beneficiary: decoded.args[1]!.toString(),
      assets: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.POLKADOT_XCM_TELEPORT]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      beneficiary: decoded.args[1]!.toString(),
      assets: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      beneficiary: decoded.args[1]!.toString(),
      assets: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: (decoded): Record<string, any> => {
    return {
      asset: decoded.args[0]!.toString(),
      dest: decoded.args[1]!.toString(),
    };
  },
  [TransactionType.POLKADOT_XCM_RESERVE_WITHDRAW]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      beneficiary: decoded.args[1]!.toString(),
      assets: decoded.args[2]!.toString(),
      feeAssetItem: decoded.args[3]!.toString(),
    };
  },
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      assets: decoded.args[1]!.toString(),
      assetsTransferType: decoded.args[2]!.toString(),
      remoteFeesId: decoded.args[3]!.toString(),
      feesTransferType: decoded.args[4]!.toString(),
      customXcmOnDest: decoded.args[5]!.toString(),
      weightLimit: decoded.args[6]!.toString(),
    };
  },
  [TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN]: (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0]!.toString(),
      assets: decoded.args[1]!.toString(),
      assetsTransferType: decoded.args[2]!.toString(),
      remoteFeesId: decoded.args[3]!.toString(),
      feesTransferType: decoded.args[4]!.toString(),
      customXcmOnDest: decoded.args[5]!.toString(),
      weightLimit: decoded.args[6]!.toString(),
    };
  },
  [TransactionType.XTOKENS_TRANSFER]: (decoded): Record<string, any> => {
    return {
      currencyId: decoded.args[0]!.toString(),
      amount: decoded.args[1]!.toString(),
      dest: decoded.args[2]!.toString(),
      destWeightLimit: decoded.args[3]?.toString(),
    };
  },
  [TransactionType.XTOKENS_TRANSFER_MULTIASSETS]: (decoded): Record<string, any> => {
    return {
      assets: decoded.args[0]!.toString(),
      feeItem: decoded.args[1]?.toString(),
      dest: decoded.args[2]!.toString(),
      destWeightLimit: decoded.args[3]?.toString(),
    };
  },
  [TransactionType.BOND]: (decoded): Record<string, any> => {
    const args: Record<string, any> = {};
    let index = 0;
    if (decoded.args.length === BOND_WITH_CONTROLLER_ARGS_AMOUNT) {
      args.controller = decoded.args[index++]!.toString();
    }

    args.value = decoded.args[index++]!.toString();
    const payee = decoded.args[index++]!.toString();

    try {
      args.payee = JSON.parse(payee);
    } catch {
      args.payee = payee;
    }

    if (typeof args.payee === 'object') {
      args.payee = { Account: Object.values(args.payee)[0] };
    }

    return args;
  },
  [TransactionType.UNSTAKE]: (decoded): Record<string, any> => {
    return { value: decoded.args[0]!.toString() };
  },
  [TransactionType.CHILL]: (): Record<string, any> => {
    return {};
  },
  [TransactionType.RESTAKE]: (decoded): Record<string, any> => {
    return { value: decoded.args[0]!.toString() };
  },
  [TransactionType.REDEEM]: (): Record<string, any> => {
    return {};
  },
  [TransactionType.NOMINATE]: (decoded): Record<string, any> => {
    return { targets: (decoded.args[0] as any).map((a: Type) => a.toString()) };
  },
  [TransactionType.STAKE_MORE]: (decoded): Record<string, any> => {
    return { maxAdditional: decoded.args[0]!.toString() };
  },
  [TransactionType.DESTINATION]: (decoded): Record<string, any> => {
    const args: Record<string, any> = {};
    try {
      args.payee = JSON.parse(decoded.args[0]!.toString());
    } catch (e) {
      console.warn(e);
      args.payee = decoded.args[0]!.toString();
    }

    if (typeof args.payee === 'object') {
      args.payee = { Account: Object.values(args.payee)[0] };
    }

    return args;
  },
  [TransactionType.BATCH_ALL]: (decoded): Record<string, any> => {
    return { calls: decoded.args[0]!.toHex() };
  },
  [TransactionType.MULTISIG_AS_MULTI]: (decoded): Record<string, any> => {
    const baseParams = {
      threshold: decoded.args[0]!.toString(),
      otherSignatories: decoded.args[1]!.toHuman(),
      timepoint: decoded.args[2]!.toString(),
      call: decoded.args[3]!.toHex(),
    };

    if (decoded.args.length === OLD_MULTISIG_ARGS_AMOUNT) {
      return {
        ...baseParams,
        storeCall: decoded.args[4]!.toString(),
        maxWeight: decoded.args[5]!.toString(),
      };
    }

    return {
      ...baseParams,
      maxWeight: decoded.args[4]!.toHuman(),
    };
  },
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: (decoded): Record<string, any> => {
    return {
      threshold: decoded.args[0]!.toString(),
      otherSignatories: decoded.args[1]!.toHuman(),
      timepoint: decoded.args[2]!.toString(),
      callHash: decoded.args[3]!.toHex(),
      maxWeight: decoded.args[4]!.toHuman(),
    };
  },
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: (decoded): Record<string, any> => {
    return {
      threshold: decoded.args[0]!.toString(),
      otherSignatories: decoded.args[1]!.toHuman(),
      timepoint: decoded.args[2]!.toString(),
      callHash: decoded.args[3]!.toHex(),
    };
  },
  [TransactionType.ADD_PROXY]: (decoded): Record<string, any> => {
    return {
      delegate: decoded.args[0]!.toString(),
      proxyType: decoded.args[1]!.toString(),
      delay: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.CREATE_PURE_PROXY]: (decoded): Record<string, any> => {
    return {
      proxyType: decoded.args[0]!.toString(),
      delay: decoded.args[1]!.toString(),
      index: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.REMOVE_PROXY]: (decoded): Record<string, any> => {
    return {
      delegate: decoded.args[0]!.toString(),
      proxyType: decoded.args[1]!.toString(),
      delay: decoded.args[2]!.toString(),
    };
  },
  [TransactionType.KILL_PURE_PROXY]: (decoded): Record<string, any> => {
    return {
      spawner: decoded.args[0]!.toString(),
      proxyType: decoded.args[1]!.toString(),
      index: decoded.args[2]!.toString(),
      height: decoded.args[3]!.toString(),
      extIndex: decoded.args[4]!.toString(),
    };
  },
  [TransactionType.PROXY]: (decoded): Record<string, any> => {
    return {
      real: decoded.args[0]!.toString(),
      forceProxyType: decoded.args[1]!.toString(),
      call: decoded.args[2]!.toHex(),
    };
  },
  [TransactionType.REMARK]: (decoded): Record<string, any> => {
    return { remark: decoded.args[0]!.toString() };
  },
  [TransactionType.REMARK_WITH_EVENT]: (decoded): Record<string, any> => {
    return { remark: decoded.args[0]!.toString() };
  },
  [TransactionType.UNLOCK]: (decoded): Record<string, any> => {
    return {
      class: decoded.args[0]!.toString(),
      target: decoded.args[1]!.toString(),
    };
  },
  [TransactionType.VOTE]: (decoded): Record<string, any> => {
    return {
      referendum: decoded.args[0]!.toString(),
      vote: decoded.args[1]!.toHuman(),
    };
  },
  [TransactionType.REMOVE_VOTE]: (decoded): Record<string, any> => {
    return {
      track: decoded.args[0]!.toString(),
      referendum: decoded.args[1]!.toString(),
    };
  },
  [TransactionType.UNDELEGATE]: (decoded): Record<string, any> => {
    return {
      track: decoded.args[0]!.toString(),
    };
  },
  [TransactionType.DELEGATE]: (decoded): Record<string, any> => {
    return {
      track: decoded.args[0]!.toString(),
      target: decoded.args[1]!.toString(),
      conviction: decoded.args[2]!.toString(),
      balance: decoded.args[3]!.toString(),
    };
  },
  [TransactionType.EDIT_DELEGATION]: (decoded): Record<string, any> => {
    return {
      track: decoded.args[0]!.toString(),
      target: decoded.args[1]!.toString(),
      conviction: decoded.args[2]!.toString(),
      balance: decoded.args[3]!.toString(),
    };
  },
  [TransactionType.COLLECTIVE_VOTE]: (decoded): Record<string, any> => {
    return {
      pool: decoded.args[0]!.toString(),
      aye: decoded.args[1]!.toPrimitive(),
    };
  },
  [TransactionType.COLLECTIVE_SET_ACTIVE]: (decoded): Record<string, any> => {
    return {
      isActive: decoded.args[0]!.toPrimitive(),
    };
  },
  [TransactionType.COLLECTIVE_SALARY_REQUEST]: (): Record<string, any> => {
    return {};
  },
  [TransactionType.COLLECTIVE_SALARY_INDUCT]: (): Record<string, any> => {
    return {};
  },
  [TransactionType.COLLECTIVE_SALARY_PAYOUT]: (decoded): Record<string, any> => {
    return {
      beneficiary: decoded.args[0] ? decoded.args[0].toString() : null,
    };
  },
  [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: (decoded): Record<string, any> => {
    return {
      wish: decoded.args[0]!.toString(),
      evidence: decoded.args[1]!.toString(),
    };
  },
  [TransactionType.COLLECTIVE_EVIDENCE_VOTE]: (): Record<string, any> => {
    return {};
  },
};

const isBatchExtrinsic = (method: string, section: string): boolean => {
  return section === 'utility' && ['batchAll', 'batch', 'forceBatch'].includes(method);
};

const isProxyExtrinsic = (method: string, section: string): boolean => {
  return section === 'proxy' && method === 'proxy';
};

export const getTransactionType = (method: string, section: string): TransactionType | undefined => {
  const transferType = getTransferTxType(method, section);
  const stakingType = getStakingTxType(method, section);
  const xcmType = getXcmTxType(method, section);
  const proxyType = getProxyTxType(method, section);
  const multisigType = getMultisigTxType(method, section);
  const governanceType = getGovernanceTxType(method, section);
  const collectiveType = getCollectiveTxType(method, section);
  const vestingType = getVestingTxType(method, section);
  const systemType = getSystemTxType(method, section);

  return (
    transferType ||
    stakingType ||
    xcmType ||
    proxyType ||
    multisigType ||
    governanceType ||
    collectiveType ||
    vestingType ||
    systemType
  );
};

const getSystemTxType = (method: string, section: string): TransactionType | undefined => {
  if (SYSTEM_SECTION !== section) return;

  return {
    remark: TransactionType.REMARK,
    remarkWithEvent: TransactionType.REMARK_WITH_EVENT,
  }[method];
};

const getTransferTxType = (method: string, section: string): TransactionType | undefined => {
  if (!TRANSFER_SECTIONS.includes(section)) return;

  const TRANSFER_METHODS = ['transfer', 'transferKeepAlive', 'transferAllowDeath'];

  if (TRANSFER_METHODS.includes(method) && section === 'balances') return TransactionType.TRANSFER;
  if (method === 'transferAll' && section === 'balances') return TransactionType.TRANSFER_ALL;
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
      transferAssetsUsingTypeAndThen: TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN,
    }[method];
  }

  if (section === 'polkadotXcm') {
    return {
      limitedReserveTransferAssets: TransactionType.POLKADOT_XCM_LIMITED_TRANSFER,
      limitedTeleportAssets: TransactionType.POLKADOT_XCM_TELEPORT,
      transferAssets: TransactionType.POLKADOT_XCM_TRANSFER_ASSETS,
      reserveTransferAssets: TransactionType.POLKADOT_XCM_RESERVE_WITHDRAW,
      transferAssetsUsingTypeAndThen: TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN,
    }[method];
  }

  if (section === 'xTokens') {
    return {
      transferMultiasset: TransactionType.XTOKENS_TRANSFER_MULTIASSET,
      transfer: TransactionType.XTOKENS_TRANSFER,
      transferMultiassets: TransactionType.XTOKENS_TRANSFER_MULTIASSETS,
    }[method];
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
    killPure: TransactionType.KILL_PURE_PROXY,
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
    delegate: TransactionType.DELEGATE,
    undelegate: TransactionType.UNDELEGATE,
  }[method];
};

const getCollectiveTxType = (method: string, section: string): TransactionType | undefined => {
  if (!section.endsWith('Collective')) return;

  return {
    vote: TransactionType.COLLECTIVE_VOTE,
    set_active: TransactionType.COLLECTIVE_SET_ACTIVE,
  }[method];
};

const getVestingTxType = (method: string, section: string): TransactionType | undefined => {
  if (VESTING_SECTION !== section) return;

  return {
    vestedTransfer: TransactionType.VESTED_TRANSFER,
    vest: TransactionType.VEST,
  }[method];
};
