import { ApiPromise } from '@polkadot/api';
import { Call } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { HexString } from '@polkadot/util/types';
import { Type } from '@polkadot/types';

import { Address, CallData } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { BOND_WITH_CONTROLLER_ARGS_AMOUNT } from '@renderer/services/transaction/common/constants';

/**
 * Store all call data args parsers.
 * Identify which call data parser has to be called for the transaction.
 *
 */
export class CallDataDecoderProvider {
  private callDataParsers = new Map<TransactionType, ICallDataParser>();
  constructor() {
    const tbParser = new TransferBalancesCallDataParser();
    const taParser = new TransferAssetsCallDataParser();
    const toParser = new TransferORMLCallDataParser();
    const sbParser = new StakingBondCallDataParser();
    const subParser = new StakingUnbondCallDataParser();
    const scParser = new StakingChillCallDataParser();
    const srParser = new StakingRestakeCallDataParser();
    const sredParser = new StakingRedeemCallDataParser();
    const snParser = new StakingNominateCallDataParser();
    const ssmParser = new StakingStakeMoreCallDataParser();
    const ssdParser = new StakingChangeDestinationCallDataParser();
    const baParser = new BatchAllCallDataParser();

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
  }

  public parse(api: ApiPromise, address: Address, callData: CallData): Transaction {
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
  ): Transaction {
    let transactionType: TransactionType;
    if (method === 'batchAll' && section === 'utility') {
      transactionType = TransactionType.BATCH_ALL;
    } else {
      throw new Error('errr'); //todo
    }

    const callDataParser = this.callDataParsers.get(transactionType);
    if (!callDataParser) {
      throw new Error(`CallDataParser for ${transactionType} not found`);
    }
    const batchTransaction = callDataParser.parse(address, decoded, method, section, api.genesisHash.toHex());
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
  ): Transaction {
    console.log(`Start parsing call data for section ${section} and method ${method}`);
    const transferMethods = ['transfer', 'transferKeepAlive', 'transferAllowDeath'];
    let transactionType: TransactionType;
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
    } else {
      throw new Error('errr'); //todo
    }
    const callDataParser = this.callDataParsers.get(transactionType);
    if (!callDataParser) {
      throw new Error(`CallDataParser for ${transactionType} not found`);
    }

    return callDataParser.parse(address, decoded, method, section, genesisHash);
  }

  private isBatchExtrinsic(method: string, section: string): boolean {
    return section === 'utility' && method === 'batchAll';
  }
}

interface ICallDataParser {
  parse(
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    method: string,
    section: string,
    genesisHash: HexString,
  ): Transaction;
  supports(): TransactionType;
}

abstract class AbstractCallDataParser implements ICallDataParser {
  abstract supports(): TransactionType;

  abstract parseDecodedCallArgs(
    method: string,
    section: string,
    decoded: SubmittableExtrinsic<'promise'>,
  ): Record<string, any>;

  public parse(
    address: Address,
    decoded: SubmittableExtrinsic<'promise'>,
    method: string,
    section: string,
    genesisHash: HexString,
  ): Transaction {
    const transaction: Transaction = this.prepareTransaction(address, genesisHash, method, section);
    const parseResult = this.parseDecodedCallArgs(method, section, decoded);
    if (parseResult) {
      transaction.args = parseResult;
    }

    return transaction;
  }

  protected prepareTransaction(address: Address, chainId: HexString, method: string, section: string): Transaction {
    const transaction: Transaction = {
      address: address,
      chainId: chainId,
      method: method,
      section: section,
      args: {},
      type: this.supports(),
    };

    return transaction;
  }
}

class TransferBalancesCallDataParser extends AbstractCallDataParser {
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

class TransferAssetsCallDataParser extends AbstractCallDataParser {
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

class TransferORMLCallDataParser extends AbstractCallDataParser {
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

class StakingBondCallDataParser extends AbstractCallDataParser {
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

class StakingUnbondCallDataParser extends AbstractCallDataParser {
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

class StakingChillCallDataParser extends AbstractCallDataParser {
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

class StakingRestakeCallDataParser extends AbstractCallDataParser {
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

class StakingRedeemCallDataParser extends AbstractCallDataParser {
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

class StakingNominateCallDataParser extends AbstractCallDataParser {
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

class StakingStakeMoreCallDataParser extends AbstractCallDataParser {
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

class StakingChangeDestinationCallDataParser extends AbstractCallDataParser {
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

class BatchAllCallDataParser extends AbstractCallDataParser {
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
