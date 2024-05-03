import { GraphQLClient } from 'graphql-request';

import type { AccountId } from '@shared/core';
import { FILTER_MULTISIG_ACCOUNT_IDS } from './graphql/queries/multisigs';

export const multisigService = {
  filterMultisigsAccountIds,
};

export type MultisigResult = {
  accountId: AccountId;
  threshold: number;
  signatories: AccountId[];
};

async function filterMultisigsAccountIds(client: GraphQLClient, accountIds: AccountId[]): Promise<MultisigResult[]> {
  const data = await client.request(FILTER_MULTISIG_ACCOUNT_IDS, { accountIds });

  //TODO remove this
  // const data = {
  //   accounts: {
  //     nodes: [
  //       {
  //         id: '0xe1957f4b72abff83b4382b53415ab906c92edcefebc96432393b56ab279019fa',
  //         address: '5HAV3LmmcvNJK1GcT4E6PbJqY5bdNZarHqbkkKUDu3nhWrbD',
  //         threshold: 2,
  //         isMultisig: true,
  //         signatories: {
  //           nodes: [
  //             {
  //               signatory: {
  //                 id: '0xac7ca845f847034cc513751b2e1a95db412f85acfa607305bcaa017d09029e6e',
  //                 address: '5Fxs8AMi7eA6StT5QaXQzLavWScvmPWBTdNivzUguu41KE8L',
  //               },
  //             },
  //             {
  //               signatory: {
  //                 id: '0x7c6bb0cfc976a5a68c6493c963ac05427423d37d4a21f3d5a589bbe0756b3b59',
  //                 address: '5EsqnXGHzDeMmDCNYchoMh67xM3S7uRdhwMsUtwd5dJsksew',
  //               },
  //             },
  //             {
  //               signatory: {
  //                 id: '0x4e66461fed55e8de6988270d17e18f29a5c3fb0fc6ca39f9a9f41bff01510665',
  //                 address: '5DqVySMC366P8NRjdyp948TJj64hAvg17eaiEn4ZbuKCNZHc',
  //               },
  //             },
  //           ],
  //         },
  //       },
  //     ],
  //   },
  // };
  const filteredMultisigIds = (data as any)?.accounts?.nodes?.map(({ id, threshold, signatories }: any) => ({
    accountId: id,
    threshold,
    signatories: signatories.nodes.map(({ signatory }: any) => signatory.id),
  }));

  return filteredMultisigIds || [];
}
