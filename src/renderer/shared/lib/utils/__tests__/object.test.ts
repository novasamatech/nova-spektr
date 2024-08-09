import { BN } from '@polkadot/util';

import { toSerializable } from '../objects';

describe('shared/lib/utils/object', () => {
  describe('toSerializable', () => {
    test.each([
      [true, true],
      [null, null],
      [undefined, undefined],
      ['string', 'string'],
      [100, 100],
      [['test'], ['test']],
      [{ hello: 'world' }, { hello: 'world' }],
      [new Set([1, 2, 3]), [1, 2, 3]],
      [
        new Map([
          ['1', 1],
          ['2', 2],
          ['3', 3],
        ]),
        { 1: 1, 2: 2, 3: 3 },
      ],
      [
        [{ hello: 'world' }, 'test', 123],
        [{ hello: 'world' }, 'test', 123],
      ],
      [new BN('10000'), '10000'],
      [new Date('2021-11-17T00:00:00.000Z'), '2021-11-17T00:00:00.000Z'],
    ])('should convert %p to serializable', (value, expected) => {
      expect(toSerializable(value)).toEqual(expected);
    });
  });
});
