import { CallDataDecoderProvider } from '@renderer/services/transaction/callDataParser/callDataParser';
import { TransactionType } from '@renderer/domain/transaction';

describe('/service/transaction/callDataParser/callDataParser', () => {
  test('Check all operations are supported correctly', () => {
    const provider = new CallDataDecoderProvider();
    // @ts-ignore
    Object.values(TransactionType).forEach((transactionType) => {
      console.log(`Check parser for type ${transactionType}`);
      const parser = provider['callDataParsers'].get(transactionType);
      expect(parser).toBeDefined();
      expect(parser?.supports()).toEqual(transactionType);
    });
  });
});
