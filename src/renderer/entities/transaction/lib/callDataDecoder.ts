import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type Call } from '@polkadot/types/interfaces';

import { type CallData, TransactionType } from '@/shared/core';

import {
  GOVERNANCE_SECTION,
  MULTISIG_SECTION,
  PROXY_SECTION,
  STAKING_SECTION,
  TRANSFER_SECTIONS,
  XCM_SECTIONS,
} from './common/constants';

export const getDataFromCallData = (
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

export const getTxFromCallData = (api: ApiPromise, callData: CallData): SubmittableExtrinsic<'promise'> => {
  return getDataFromCallData(api, callData).decoded;
};

export const getTransactionType = (method?: string | null, section?: string | null): TransactionType | undefined => {
  if (!method || !section) return;

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
    set_active: TransactionType.COLLECTIVE_SET_ACTIVE,
  }[method];
};
