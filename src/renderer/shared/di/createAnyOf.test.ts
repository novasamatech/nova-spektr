import { isArray, isNumber, isString } from 'lodash';

import { createAnyOf, isAnyOfIdentifier } from './createAnyOf';

describe('createAnyOf', () => {
  it('should check type', () => {
    expect(isAnyOfIdentifier(createAnyOf())).toBeTruthy();
    expect(isAnyOfIdentifier({})).toBeFalsy();
  });

  it('should handle simple case with type check', () => {
    const flag = createAnyOf<unknown>();

    flag.registerHandler({ body: isNumber, available: () => true });
    flag.registerHandler({ body: isArray, available: () => true });
    flag.registerHandler({ body: isString, available: () => true });

    const res = flag.check([]);

    expect(res).toEqual(true);
  });

  it('should skip void', () => {
    const flag = createAnyOf<unknown>();

    flag.registerHandler({ body: isNumber, available: () => false });
    flag.registerHandler({ body: () => undefined, available: () => true });

    const res = flag.check('');

    expect(res).toEqual(false);
  });
});
