import { type AccountId } from '@/shared/polkadotjs-schemas';
import { buildShares } from '../subquery';

const ourNominator = '0x01' as AccountId;
const ourValidator = '0x02' as AccountId;

const byAddress = new Map<string, AccountId>([
  ['NominatorAddr', ourNominator],
  ['ValidatorAddr', ourValidator],
]);

describe('domains/staking/era-rewards/subquery', () => {
  test('should pick our nominator line out of others', () => {
    const shares = buildShares(
      { address: 'ForeignValidator', own: '500', others: [{ who: 'NominatorAddr', value: '100' }] },
      byAddress,
    );

    expect(shares).toEqual({ [ourNominator]: '100' });
  });

  test('should add the own line when the row validator is our stash', () => {
    const shares = buildShares(
      { address: 'ValidatorAddr', own: '500', others: [{ who: 'Someone', value: '9' }] },
      byAddress,
    );

    expect(shares).toEqual({ [ourValidator]: '500' });
  });

  test('should carry both our nominator share and our validator own line on one row', () => {
    const shares = buildShares(
      { address: 'ValidatorAddr', own: '500', others: [{ who: 'NominatorAddr', value: '100' }] },
      byAddress,
    );

    expect(shares).toEqual({ [ourNominator]: '100', [ourValidator]: '500' });
  });

  test('should not add an own line for a foreign validator', () => {
    const shares = buildShares({ address: 'ForeignValidator', own: '500', others: null }, byAddress);

    expect(shares).toEqual({});
  });
});
