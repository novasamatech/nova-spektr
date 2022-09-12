import { ApiPromise } from '@polkadot/api';
import { AccountInfo } from '@polkadot/types/interfaces';

import chains from '../../../src/renderer/services/network/common/chains.json';
import { validate } from '../../../src/renderer/services/dataVerification/dataVerification';
import {
  getTestAccounts,
  TestAccountsURL,
  prepareTestData,
  createWsConnection,
  ChainJSON,
  TestAccounts,
} from '../utils';

let [networks, polkadotParachains, kusamaParachains, polkadot, kusama] = prepareTestData(<ChainJSON[]>chains);

/**
 * Data Verification integration tests
 *
 * @group integration
 * @group dataVerification/base
 */

describe('services/dataVerification', () => {
  let polkadotApi: ApiPromise;
  let kusamaApi: ApiPromise;
  let testAccounts: TestAccounts[];

  beforeEach(async () => {
    polkadotApi = await createWsConnection(polkadot.nodes[0].url);
    kusamaApi = await createWsConnection(kusama.nodes[0].url);
    testAccounts = await getTestAccounts(TestAccountsURL);
  });

  test.each(polkadotParachains)('Can verify data for polkadot', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);
    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));

    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    parachainApi.query.system.account(parachainAccount?.account, async (data: AccountInfo) => {
      const validationStatus = await validate(polkadotApi, parachainApi, storageKey, data);
      expect(validationStatus).toBe(true);
    });
  });

  test.each(kusamaParachains)('Can verify data for kusama', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);

    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));
    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    parachainApi.query.system.account(parachainAccount?.account, async (data: AccountInfo) => {
      const validationStatus = await validate(kusamaApi, parachainApi, storageKey, data);
      expect(validationStatus).toBe(true);
    });
  });
});
