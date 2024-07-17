import { type Chain, ChainOptions } from '@shared/core';

import { multisigUtils } from '../mulitisigs-utils';

describe('features/multisigs/lib/multisigs-utils', () => {
  test('should return true if "multisig" is included in chain options', () => {
    const chainWithMultisig = { options: [ChainOptions.MULTISIG] } as Chain;
    const result = multisigUtils.isMultisigSupported(chainWithMultisig);

    expect(result).toEqual(true);
  });

  test('should return false if "multisig" is not included in chain options', () => {
    const chainWithoutMultisig = { options: [ChainOptions.REGULAR_PROXY] } as Chain;
    const result = multisigUtils.isMultisigSupported(chainWithoutMultisig);

    expect(result).toEqual(false);
  });

  test('should return false if chain options is undefined', () => {
    const chainWithUndefinedOptions = {} as Chain;
    const result = multisigUtils.isMultisigSupported(chainWithUndefinedOptions);

    expect(result).toEqual(false);
  });
});
