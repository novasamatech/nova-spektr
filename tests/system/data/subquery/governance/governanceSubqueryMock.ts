export const mockDelegatorVotingsX1 = {
  data: {
    delegatorVotings: {
      nodes: [
        {
          vote: {
            amount: '20000000000000',
            conviction: 'Locked1x',
          },
          parent: {
            referendumId: '1300',
            standardVote: {
              aye: true,
              vote: {
                amount: '50000000000000',
                conviction: 'Locked1x',
              },
            },
            delegateId: '127zarPDhVzmCXVQ7Kfr1yyaa9wsMuJ74GJW9Q7ezHfQEgh6',
          },
        },
      ],
    },
  },
};

export const mockDelegatorVotingsX2 = {
  data: {
    delegatorVotings: {
      nodes: [
        {
          vote: {
            amount: '20000000000000',
            conviction: 'Locked2x',
          },
          parent: {
            referendumId: '1300',
            standardVote: {
              aye: true,
              vote: {
                amount: '50000000000000',
                conviction: 'Locked1x',
              },
            },
            delegateId: '127zarPDhVzmCXVQ7Kfr1yyaa9wsMuJ74GJW9Q7ezHfQEgh6',
          },
        },
      ],
    },
  },
};

export const mockDirectVotings = {
  data: {
    delegatorVotings: {
      nodes: [
        {
          vote: {
            amount: '10000000000000',
            conviction: 'Locked1x',
          },
        },
      ],
    },
  },
};
