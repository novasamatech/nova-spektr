import { BN, BN_TEN } from '@polkadot/util';

type BnArgument = string | { value: string; precision: number };
const createBigNumber = (value: BnArgument): BN => {
  if (typeof value === 'string') {
    return new BN(value);
  }

  return new BN(value.value).div(BN_TEN.pow(new BN(value.precision)));
};

/**
 * Big number utility function to be used in sorting
 * @param first value one
 * @param second value two
 * @return {Number}
 */
export const bigNumberSorter = (first: BnArgument, second: BnArgument): number => {
  const firstBN = createBigNumber(first);
  const secondBN = createBigNumber(second);

  if (firstBN.gt(secondBN)) return 1;
  if (firstBN.lt(secondBN)) return -1;

  return 0;
};
