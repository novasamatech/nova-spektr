import { CallDataDecoder } from '@renderer/services/transaction/callDataDecoder/callDataDecoder';
import { TransactionType } from '@renderer/domain/transaction';

describe('/service/transaction/callDataDecoder/callDataDecoder', () => {
  test('Check all operations are supported correctly', () => {
    const provider = new CallDataDecoder();
    // @ts-ignore
    Object.values(TransactionType).forEach((transactionType) => {
      console.log(`Check parser for type ${transactionType}`);
      const parser = provider['callDataParsers'].get(transactionType);
      expect(parser).toBeDefined();
      expect(parser?.supports()).toEqual(transactionType);
    });
  });
});
