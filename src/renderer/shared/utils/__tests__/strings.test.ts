import { formatSectionAndMethod } from '../strings';

describe('shared/utils/strings', () => {
  describe('formatSectionAndMethod', () => {
    test('should make capital and add :', () => {
      expect(formatSectionAndMethod('system', 'remark')).toEqual('System: Remark');
    });
  });

  describe('formatSectionAndMethod', () => {
    test('split camel case for method', () => {
      expect(formatSectionAndMethod('proxy', 'addProxy')).toEqual('Proxy: Add proxy');
    });
  });

  describe('formatSectionAndMethod', () => {
    test('split camel case for section and method', () => {
      expect(formatSectionAndMethod('simpleProxy', 'addProxy')).toEqual('Simple proxy: Add proxy');
    });
  });
});
