import { ApiPromise } from '@polkadot/api';
import { AccountInfo } from '@polkadot/types/interfaces';
import { Codec } from '@polkadot/types/types';

import chains from '../../../src/renderer/shared/config/chains/chains.json';
import { validate } from '../../../src/renderer/services/dataVerification';
import {
  getTestAccounts,
  TestAccountsURL,
  prepareTestData,
  createWsConnection,
  ChainJSON,
  TestAccounts,
} from '../utils';

const [_, polkadotParachains, kusamaParachains, polkadot, kusama] = prepareTestData(chains as ChainJSON[]);

/**
 * Data Verification integration tests
 *
 * @group integration
 * @group dataVerification/base
 */

describe('Verification function can verify parachains', () => {
  let polkadotApi: ApiPromise;
  let kusamaApi: ApiPromise;
  let testAccounts: TestAccounts[];

  beforeAll(async () => {
    polkadotApi = await createWsConnection(polkadot.nodes[0].url);
    kusamaApi = await createWsConnection(kusama.nodes[0].url);
    testAccounts = await getTestAccounts(TestAccountsURL);
  });

  test.each(polkadotParachains)('Can verify data for polkadot parachain: $name', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);
    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));
    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    const data = await parachainApi.query.system.account(parachainAccount?.account);
    const validationStatus = await validate(polkadotApi, parachainApi, storageKey, data);

    expect(validationStatus).toBe(true);
  });

  test.each(kusamaParachains)('Can verify data for kusama parachain: $name', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);
    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));
    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    const data = await parachainApi.query.system.account(parachainAccount?.account);
    const validationStatus = await validate(kusamaApi, parachainApi, storageKey, data);

    expect(validationStatus).toBe(true);
  });

  test.each(kusamaParachains)('Verification return false if nonce was changed for $name', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);
    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));
    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    let data = (await parachainApi.query.system.account(parachainAccount?.account)) as AccountInfo;
    // changing nonce
    const new_nonce_value = data.data.free as Codec;
    data.set('nonce', new_nonce_value);

    const validationStatus = await validate(kusamaApi, parachainApi, storageKey, data);
    expect(validationStatus).toBe(false);
  });

  test.each(polkadotParachains)('Verification return false if balance was changed for $name', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);
    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));
    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    let data = (await parachainApi.query.system.account(parachainAccount?.account)) as AccountInfo;
    // changing balance
    const new_balance_value = data.data.feeFrozen as Codec;
    data.data.set('free', new_balance_value);

    const validationStatus = await validate(polkadotApi, parachainApi, storageKey, data);
    expect(validationStatus).toBe(false);
  });
});
