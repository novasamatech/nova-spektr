import { splice } from '../arrays';

describe('shared/lib/onChainUtils/arrays', () => {
  test('should insert element in the beginning', () => {
    const array = splice([1, 2, 3], 100, 0);
    expect(array).toEqual([100, 2, 3]);
  });

  test('should insert element at the end', () => {
    const array = splice([1, 2, 3], 100, 2);
    expect(array).toEqual([1, 2, 100]);
  });

  test('should insert element in the middle', () => {
    const array = splice([1, 2, 3], 100, 1);
    expect(array).toEqual([1, 100, 3]);
  });

  test('should insert element in empty array', () => {
    const array1 = splice([], 100, 0);
    const array2 = splice([], 100, 1);

    expect(array1).toEqual([100]);
    expect(array2).toEqual([100]);
  });
});
