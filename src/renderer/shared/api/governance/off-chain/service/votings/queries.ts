import { gql } from '@apollo/client';

// Schema may be checked at
// https://github.com/novasamatech/subquery-governance/blob/master/schema.graphql
// TODO: Add generated types

export const GET_VOTINGS_FOR_REFERENDUM = gql`
  query DelegateList($referendumId: String) {
    castingVotings(
      filter: {
        referendumId: { equalTo: $referendumId }
        or: [
          { splitVote: { isNull: false } }
          { splitAbstainVote: { isNull: false } }
          { standardVote: { isNull: false } }
        ]
      }
    ) {
      nodes {
        referendumId
        standardVote
        splitVote
        splitAbstainVote
        voter
        delegatorVotes {
          nodes {
            delegator
            vote
          }
        }
      }
    }
  }
`;
