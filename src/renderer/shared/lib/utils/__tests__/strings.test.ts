import { formatSectionAndMethod, splitCamelCaseString } from '../strings';

describe('shared/lib/onChainUtils/strings', () => {
  describe('formatSectionAndMethod', () => {
    test('should make capital and add :', () => {
      expect(formatSectionAndMethod('system', 'remark')).toEqual('System: Remark');
    });

    test('split camel case for method', () => {
      expect(formatSectionAndMethod('proxy', 'addProxy')).toEqual('Proxy: Add proxy');
    });

    test('split camel case for section and method', () => {
      expect(formatSectionAndMethod('simpleProxy', 'addProxy')).toEqual('Simple proxy: Add proxy');
    });

    test('split camel case string into parts divided by space', () => {
      expect(splitCamelCaseString('SudoBalances')).toEqual('Sudo Balances');
    });
  });
});
