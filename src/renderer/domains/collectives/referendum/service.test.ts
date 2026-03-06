import { referendaPallet } from '@/shared/pallet/referenda';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { referendumService } from './service';
import { type OngoingReferendum } from './types';

const TEST_ACCOUNT_ID = pjsSchema.helpers.toAccountId(
  '0x0000000000000000000000000000000000000000000000000000000000000001',
);

const createOngoingReferendum = (
  overrides: Partial<Pick<OngoingReferendum, 'track' | 'proposal'>>,
): OngoingReferendum => ({
  type: 'Ongoing',
  id: referendaPallet.helpers.toReferendumId(1),
  chainId: '0x00',
  pallet: 'fellowship',
  origin: 'Fellowship1Dan',
  track: 21,
  proposal: null,
  submitted: pjsSchema.helpers.toBlockHeight(100),
  submissionDeposit: null,
  decisionDeposit: null,
  inQueue: false,
  enactment: { value: 100, type: 'After' },
  deciding: { since: pjsSchema.helpers.toBlockHeight(100), confirming: null },
  ends: pjsSchema.helpers.toBlockHeight(200),
  tally: { ayes: 0, nays: 0, bareAyes: 0 },
  ...overrides,
});

describe('referendum service', () => {
  describe('getRankForReferendum', () => {
    it('returns proposal.rank when Evidence proposal has rank (promote)', () => {
      const referendum = createOngoingReferendum({
        track: 33,
        proposal: {
          type: 'Evidence',
          accountId: TEST_ACCOUNT_ID,
          rank: 4,
        },
      });
      expect(referendumService.getRankForReferendum(referendum)).toEqual(4);
    });

    it('returns proposal.rank when Evidence proposal has rank (approve/retention)', () => {
      const referendum = createOngoingReferendum({
        track: 11,
        proposal: {
          type: 'Evidence',
          accountId: TEST_ACCOUNT_ID,
          rank: 1,
        },
      });
      expect(referendumService.getRankForReferendum(referendum)).toEqual(1);
    });

    it('falls back to track-derived rank when proposal has no rank (fast promotion track 33)', () => {
      const referendum = createOngoingReferendum({
        track: 33,
        proposal: {
          type: 'Evidence',
          accountId: TEST_ACCOUNT_ID,
        },
      });
      expect(referendumService.getRankForReferendum(referendum)).toEqual(3);
    });

    it('falls back to track-derived rank when proposal has no rank (retention track 12)', () => {
      const referendum = createOngoingReferendum({
        track: 12,
        proposal: {
          type: 'Evidence',
          accountId: TEST_ACCOUNT_ID,
        },
      });
      expect(referendumService.getRankForReferendum(referendum)).toEqual(2);
    });

    it('falls back to track-derived rank when proposal is null', () => {
      const referendum = createOngoingReferendum({
        track: 22,
        proposal: null,
      });
      expect(referendumService.getRankForReferendum(referendum)).toEqual(2);
    });

    it('returns null when track does not map to a valid rank', () => {
      const referendum = createOngoingReferendum({
        track: 0,
        proposal: null,
      });
      expect(referendumService.getRankForReferendum(referendum)).toBeNull();
    });
  });
});
