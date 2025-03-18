import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type Type } from '@polkadot/types';

import { xcmService } from '@/shared/api/xcm';
import { type AnyDecodedTransaction } from '@/domains/network';

import { BOND_WITH_CONTROLLER_ARGS_AMOUNT } from './constants';

export const decodeCallData = (extrinsic: SubmittableExtrinsic<'promise'>): AnyDecodedTransaction | null => {
  const { section, method } = extrinsic.method;

  const parser = getCallDataParser[`${section}.${method}`];
  if (!parser) return null;

  return {
    type: 'decoded',
    section,
    method,
    args: parser(extrinsic),
  };
};

export const getCallDataParser: Record<string, (decoded: SubmittableExtrinsic<'promise'>) => Record<string, any>> = {
  'balances.transferKeepAlive': (decoded): Record<string, any> => {
    return { dest: decoded.args[0].toString(), value: decoded.args[1].toString() };
  },
  'balances.transfer': (decoded): Record<string, any> => {
    return { dest: decoded.args[0].toString(), value: decoded.args[1].toString() };
  },
  'balances.transferAll': (decoded): Record<string, any> => {
    return { dest: decoded.args[0].toString() };
  },
  'assets.transfer': (decoded): Record<string, any> => {
    return {
      assetId: decoded.args[0].toString(),
      dest: decoded.args[1].toString(),
      value: decoded.args[2].toString(),
    };
  },
  'currencies.transfer': (decoded): Record<string, any> => {
    return {
      dest: decoded.args[0].toString(),
      assetId: decoded.args[1].toString(),
      value: decoded.args[2].toString(),
    };
  },
  'xcmPallet.limitedReserveTransferAssets': (decoded): Record<string, any> => {
    return xcmService.parseXcmPalletExtrinsic({
      dest: decoded.args[0].toHuman(),
      beneficiary: decoded.args[1].toHuman(),
      assets: decoded.args[2].toHuman(),
    });
  },
  'xcmPallet.limitedTeleportAssets': (decoded): Record<string, any> => {
    return xcmService.parseXcmPalletExtrinsic({
      dest: decoded.args[0].toHuman(),
      beneficiary: decoded.args[1].toHuman(),
      assets: decoded.args[2].toHuman(),
    });
  },
  'polkadotXcm.limitedReserveTransferAssets': (decoded): Record<string, any> => {
    return xcmService.parseXcmPalletExtrinsic({
      dest: decoded.args[0].toHuman(),
      beneficiary: decoded.args[1].toHuman(),
      assets: decoded.args[2].toHuman(),
    });
  },
  'polkadotXcm.limitedTeleportAssets': (decoded): Record<string, any> => {
    return xcmService.parseXcmPalletExtrinsic({
      dest: decoded.args[0].toHuman(),
      beneficiary: decoded.args[1].toHuman(),
      assets: decoded.args[2].toHuman(),
    });
  },
  'polkadotXcm.transferAssets': (decoded): Record<string, any> => {
    return xcmService.parseXcmPalletExtrinsic({
      dest: decoded.args[0].toHuman(),
      beneficiary: decoded.args[1].toHuman(),
      assets: decoded.args[2].toHuman(),
    });
  },
  'xTokens.transferMultiasset': (decoded): Record<string, any> => {
    return xcmService.parseXTokensExtrinsic({
      asset: decoded.args[0].toHuman(),
      dest: decoded.args[1].toHuman(),
    });
  },
  'staking.bond': (decoded): Record<string, any> => {
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
  'staking.unbond': (decoded): Record<string, any> => {
    return { value: decoded.args[0].toString() };
  },
  'staking.chill': (): Record<string, any> => {
    return {};
  },
  'staking.rebond': (decoded): Record<string, any> => {
    return { value: decoded.args[0].toString() };
  },
  'staking.withdrawUnbonded': (): Record<string, any> => {
    return {};
  },
  'staking.nominate': (decoded): Record<string, any> => {
    return { targets: (decoded.args[0] as any).map((a: Type) => a.toString()) };
  },
  'staking.bondExtra': (decoded): Record<string, any> => {
    return { maxAdditional: decoded.args[0].toString() };
  },
  'staking.setPayee': (decoded): Record<string, any> => {
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
  'multisig.approveAsMulti': (decoded): Record<string, any> => {
    return {
      threshold: decoded.args[0].toString(),
      otherSignatories: decoded.args[1].toHuman(),
      timepoint: decoded.args[2].toString(),
      callHash: decoded.args[3].toHex(),
      maxWeight: decoded.args[4].toHuman(),
    };
  },
  'multisig.cancelAsMulti': (decoded): Record<string, any> => {
    return {
      threshold: decoded.args[0].toString(),
      otherSignatories: decoded.args[1].toHuman(),
      timepoint: decoded.args[2].toString(),
      callHash: decoded.args[3].toHex(),
    };
  },
  'proxy.addProxy': (decoded): Record<string, any> => {
    return {
      delegate: decoded.args[0].toString(),
      proxyType: decoded.args[1].toString(),
      delay: decoded.args[2].toString(),
    };
  },
  'proxy.createPure': (decoded): Record<string, any> => {
    return {
      proxyType: decoded.args[0].toString(),
      delay: decoded.args[1].toString(),
      index: decoded.args[2].toString(),
    };
  },
  'proxy.removeProxy': (decoded): Record<string, any> => {
    return {
      delegate: decoded.args[0].toString(),
      proxyType: decoded.args[1].toString(),
      delay: decoded.args[2].toString(),
    };
  },
  'proxy.killPure': (decoded): Record<string, any> => {
    return {
      spawner: decoded.args[0].toString(),
      proxyType: decoded.args[1].toString(),
      index: decoded.args[2].toString(),
      height: decoded.args[3].toString(),
      extIndex: decoded.args[4].toString(),
    };
  },
  'system.remark': (decoded): Record<string, any> => {
    return { remark: decoded.args[0].toString() };
  },
  'convictionVoting.unlock': (decoded): Record<string, any> => {
    return {
      class: decoded.args[0].toString(),
      target: decoded.args[1].toString(),
    };
  },
  'convictionVoting.vote': (decoded): Record<string, any> => {
    return {
      referendum: decoded.args[0].toString(),
      vote: decoded.args[1].toHuman(),
    };
  },
  'convictionVoting.removeVote': (decoded): Record<string, any> => {
    return {
      track: decoded.args[0].toString(),
      referendum: decoded.args[1].toString(),
    };
  },
  'convictionVoting.delegate': (decoded): Record<string, any> => {
    return {
      track: decoded.args[0].toString(),
      target: decoded.args[1].toString(),
      conviction: decoded.args[2].toString(),
      balance: decoded.args[3].toString(),
    };
  },
  'convictionVoting.undelegate': (decoded): Record<string, any> => {
    return {
      track: decoded.args[0].toString(),
    };
  },
  'fellowshipCollective.vote': (decoded): Record<string, any> => {
    return {
      pool: decoded.args[0].toString(),
      aye: decoded.args[1].toPrimitive(),
    };
  },
  'fellowshipCore.setActive': (decoded): Record<string, any> => {
    return {
      isActive: decoded.args[0].toPrimitive(),
    };
  },
  'fellowshipSalary.register': (): Record<string, any> => {
    return {};
  },
  'fellowshipSalary.induct': (): Record<string, any> => {
    return {};
  },
  'fellowshipSalary.payout': (): Record<string, any> => {
    return {};
  },
  'fellowshipSalary.payoutOther': (decoded): Record<string, any> => {
    return {
      beneficiary: decoded.args[0].toString(),
    };
  },
  'fellowshipCore.submitEvidence': (decoded): Record<string, any> => {
    return {
      wish: decoded.args[0].toString(),
      evidence: decoded.args[1].toString(),
    };
  },
};
