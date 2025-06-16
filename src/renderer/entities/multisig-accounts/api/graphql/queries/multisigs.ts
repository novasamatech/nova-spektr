import { gql } from 'graphql-request';

export const FILTER_MULTISIG_ACCOUNT_IDS = gql`
  query Multisigs($accountIds: [String!]) {
    accounts(
      filter: { signatories: { some: { signatory: { id: { in: $accountIds } } } }, isMultisig: { equalTo: true } }
    ) {
      nodes {
        id
        threshold
        signatories {
          nodes {
            signatory {
              id
            }
          }
        }
      }
    }
  }
`;
