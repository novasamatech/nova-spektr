import { ApiPromise } from '@polkadot/api';
import { Call } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { HexString } from '@polkadot/util/types';
import { Type } from '@polkadot/types';

import { Address, CallData } from '@renderer/domain/shared-kernel';
import { DecodedTransaction, TransactionType } from '@renderer/domain/transaction';
import { BOND_WITH_CONTROLLER_ARGS_AMOUNT } from '@renderer/services/transaction/common/constants';

/**
 * Store all call data args parsers.
 * Identify which call data parser has to be called for the transaction.
 *
 */
export class CallDataDecoder {
  private callDataParsers = new Map<TransactionType, ICallDataArgsParser>();
  constructor() {
    const tbParser = new TransferBalancesCallDataArgsParser();
    const taParser = new TransferAssetsCallDataArgsParser();
    const toParser = new TransferORMLCallDataArgsParser();
    const sbParser = new StakingBondCallDataArgsParser();
    const subParser = new StakingUnbondCallDataArgsParser();
    const scParser = new StakingChillCallDataArgsParser();
    const srParser = new StakingRestakeCallDataArgsParser();
    const sredParser = new StakingRedeemCallDataArgsParser();
    const snParser = new StakingNominateCallDataArgsParser();
    const ssmParser = new StakingStakeMoreCallDataArgsParser();
    const ssdParser = new StakingChangeDestinationCallDataArgsParser();
    const baParser = new BatchAllCallDataArgsParser();
    const msAsMulti = new MultisigAsMultiCallDataArgsParser();
    const msApproveAsMulti = new MultisigApproveAsMultiCallDataArgsParser();
    const msCancelAsMulti = new MultisigCancelAsMultiCallDataArgsParser();

    this.callDataParsers.set(tbParser.supports(), tbParser);
    this.callDataParsers.set(taParser.supports(), taParser);
    this.callDataParsers.set(toParser.supports(), toParser);
    this.callDataParsers.set(sbParser.supports(), sbParser);
    this.callDataParsers.set(subParser.supports(), subParser);
    this.callDataParsers.set(scParser.supports(), scParser);
    this.callDataParsers.set(srParser.supports(), srParser);
    this.callDataParsers.set(sredParser.supports(), sredParser);
    this.callDataParsers.set(snParser.supports(), snParser);
    this.callDataParsers.set(ssmParser.supports(), ssmParser);
    this.callDataParsers.set(ssdParser.supports(), ssdParser);
    this.callDataParsers.set(baParser.supports(), baParser);
    this.callDataParsers.set(msApproveAsMulti.supports(), msApproveAsMulti);
    this.callDataParsers.set(msAsMulti.supports(), msAsMulti);
    this.callDataParsers.set(msCancelAsMulti.supports(), msCancelAsMulti);
  }

  public parse(api: ApiPromise, address: Address, callData: CallData): DecodedTransaction {
    let extrinsicCall: Call;
    let decoded: SubmittableExtrinsic<'promise'> | null = null;

    try {
      // cater for an extrinsic input...
      decoded = api.tx(callData);
      extrinsicCall = api.createType('Call', decoded.method);
    } catch (e) {
      extrinsicCall = api.createType('Call', callData);
    }
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);
    const extrinsicFn = api.tx[section][method];
    const extrinsic = extrinsicFn(...extrinsicCall.args);
    if (!decoded) {
      decoded = extrinsic;
    }
    if (this.isBatchExtrinsic(method, section)) {
      return this.parseBatch(method, section, address, decoded, api);
    } else {
      return this.parseSingle(method, section, address, decoded, api.genesisHash.toHex());
    }
  }

  private parseBatch(
    method: string,
    section: string,
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    api: ApiPromise,
  ): DecodedTransaction {
    let transactionType: TransactionType | undefined = undefined;
    if (method === 'batchAll' && section === 'utility') {
      transactionType = TransactionType.BATCH_ALL;
    }

    const batchTransaction = this.getCallDataParser(transactionType).parse(
      address,
      decoded,
      method,
      section,
      api.genesisHash.toHex(),
    );
    const calls = api.createType('Vec<Call>', batchTransaction.args.calls);
    batchTransaction.args.transactions = calls.map((call) => this.parse(api, address, call.toHex()));

    return batchTransaction;
  }

  private parseSingle(
    method: string,
    section: string,
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    genesisHash: HexString,
  ): DecodedTransaction {
    console.log(`Start parsing call data for section ${section} and method ${method}`);
    const transferMethods = ['transfer', 'transferKeepAlive', 'transferAllowDeath'];
    let transactionType: TransactionType | undefined = undefined;

    if (transferMethods.includes(method) && section === 'balances') {
      transactionType = TransactionType.TRANSFER;
    } else if (transferMethods.includes(method) && section === 'assets') {
      transactionType = TransactionType.ASSET_TRANSFER;
    } else if (method === 'transfer' && (section === 'currencies' || section === 'tokens')) {
      transactionType = TransactionType.ORML_TRANSFER;
    } else if (method === 'bond' && section === 'staking') {
      transactionType = TransactionType.BOND;
    } else if (method === 'unbond' && section === 'staking') {
      transactionType = TransactionType.UNSTAKE;
    } else if (method === 'chill' && section === 'staking') {
      transactionType = TransactionType.CHILL;
    } else if (method === 'rebond' && section === 'staking') {
      transactionType = TransactionType.RESTAKE;
    } else if (method === 'withdrawUnbonded' && section === 'staking') {
      transactionType = TransactionType.REDEEM;
    } else if (method === 'nominate' && section === 'staking') {
      transactionType = TransactionType.NOMINATE;
    } else if (method === 'bondExtra' && section === 'staking') {
      transactionType = TransactionType.STAKE_MORE;
    } else if (method === 'setPayee' && section === 'staking') {
      transactionType = TransactionType.DESTINATION;
    }

    return this.getCallDataParser(transactionType).parse(address, decoded, method, section, genesisHash);
  }

  private isBatchExtrinsic(method: string, section: string): boolean {
    return section === 'utility' && method === 'batchAll';
  }

  private getCallDataParser(transactionType: TransactionType | undefined): ICallDataArgsParser {
    if (transactionType) {
      const parser = this.callDataParsers.get(transactionType);
      if (!parser) {
        throw new Error(`Unexpected transaction type ${transactionType} for parsing call data`);
      }

      return parser;
    } else {
      return new UnknownOperationCallDataArgsParser();
    }
  }
}

interface ICallDataArgsParser {
  parse(
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    method: string,
    section: string,
    genesisHash: HexString,
  ): DecodedTransaction;
  supports(): TransactionType;
}

abstract class AbstractCallDataArgsParser implements ICallDataArgsParser {
  public parse(
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    method: string,
    section: string,
    genesisHash: HexString,
  ): DecodedTransaction {
    const transaction: DecodedTransaction = this.prepareTransaction(address, genesisHash, method, section);
    const parseResult = this.parseDecodedCallArgs(method, section, decoded);
    if (parseResult) {
      transaction.args = parseResult;
    }

    return transaction;
  }

  abstract parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any>;

  abstract supports(): TransactionType;

  protected prepareTransaction(
    address: Address,
    chainId: HexString,
    method: string,
    section: string,
  ): DecodedTransaction {
    const transaction: DecodedTransaction = {
      address: address,
      chainId: chainId,
      method: method,
      section: section,
      args: {},
      type: this.getTransactionType(),
    };

    return transaction;
  }

  protected getTransactionType(): TransactionType | undefined {
    return this.supports();
  }
}

class TransferBalancesCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return { dest: decoded.args[0].toString(), value: decoded.args[1].toString() };
  }

  supports(): TransactionType {
    return TransactionType.TRANSFER;
  }
}

class TransferAssetsCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      assetId: decoded.args[0].toString(),
      dest: decoded.args[1].toString(),
      value: decoded.args[2].toString(),
    };
  }
  supports(): TransactionType {
    return TransactionType.ASSET_TRANSFER;
  }
}

class TransferORMLCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      dest: decoded.args[0].toString(),
      assetId: decoded.args[1].toString(),
      value: decoded.args[2].toString(),
    };
  }
  supports(): TransactionType {
    return TransactionType.ORML_TRANSFER;
  }
}

class StakingBondCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
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
  }

  supports(): TransactionType {
    return TransactionType.BOND;
  }
}

class StakingUnbondCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      value: decoded.args[0].toString(),
    };
  }

  supports(): TransactionType {
    return TransactionType.UNSTAKE;
  }
}

class StakingChillCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {};
  }

  supports(): TransactionType {
    return TransactionType.CHILL;
  }
}

class StakingRestakeCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      value: decoded.args[0].toString(),
    };
  }

  supports(): TransactionType {
    return TransactionType.RESTAKE;
  }
}

class StakingRedeemCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {};
  }

  supports(): TransactionType {
    return TransactionType.REDEEM;
  }
}

class StakingNominateCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      targets: (decoded.args[0] as any).map((a: Type) => a.toString()),
    };
  }

  supports(): TransactionType {
    return TransactionType.NOMINATE;
  }
}

class StakingStakeMoreCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      maxAdditional: decoded.args[0].toString(),
    };
  }

  supports(): TransactionType {
    return TransactionType.STAKE_MORE;
  }
}

class StakingChangeDestinationCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    const args: Record<string, any> = {};
    try {
      args.payee = JSON.parse(decoded.args[0].toString());
    } catch (e) {
      console.warn(e);
      args.payee = decoded.args[0].toString();
    }

    return args;
  }

  supports(): TransactionType {
    return TransactionType.DESTINATION;
  }
}

class BatchAllCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      calls: decoded.args[0].toHex(),
    };
  }

  supports(): TransactionType {
    return TransactionType.BATCH_ALL;
  }
}

class MultisigAsMultiCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    if (decoded.args.length == 5) {
      return {
        threshold: decoded.args[0],
        otherSignatories: decoded.args[1],
        timepoint: decoded.args[2],
        call: decoded.args[3],
        maxWeight: decoded.args[4],
      };
    } else {
      return {
        threshold: decoded.args[0],
        otherSignatories: decoded.args[1],
        timepoint: decoded.args[2],
        call: decoded.args[3],
        storeCall: decoded.args[4],
        maxWeight: decoded.args[5],
      };
    }
  }

  supports(): TransactionType {
    return TransactionType.MULTISIG_AS_MULTI;
  }
}

class MultisigApproveAsMultiCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      threshold: decoded.args[0],
      otherSignatories: decoded.args[1],
      timepoint: decoded.args[2],
      callHash: decoded.args[3],
      maxWeight: decoded.args[4],
    };
  }

  supports(): TransactionType {
    return TransactionType.MULTISIG_APPROVE_AS_MULTI;
  }
}

class MultisigCancelAsMultiCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {
      threshold: decoded.args[0],
      otherSignatories: decoded.args[1],
      timepoint: decoded.args[2],
      callHash: decoded.args[3],
    };
  }

  supports(): TransactionType {
    return TransactionType.MULTISIG_CANCEL_AS_MULTI;
  }
}

class UnknownOperationCallDataArgsParser extends AbstractCallDataArgsParser {
  public parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any> {
    return {};
  }

  supports(): TransactionType {
    throw new Error('Unknown call data parser is not standard and my not be use with supported()');
  }

  getTransactionType(): TransactionType | undefined {
    return undefined;
  }
}
