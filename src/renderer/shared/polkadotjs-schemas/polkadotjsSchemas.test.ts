import { z } from 'zod';

import { pjsSchema } from './index';

describe('pjs zod schemas', () => {
  describe('structs', () => {
    it('tuppleMap', () => {
      const schema = pjsSchema.tupleMap(['number', z.number()], ['string', z.string()]);
      const result = schema.parse([1, 'test']);

      expect(result).toEqual({
        number: 1,
        string: 'test',
      });
    });
  });
});
