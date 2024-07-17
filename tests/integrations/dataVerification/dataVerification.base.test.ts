import { type ApiPromise } from '@polkadot/api';
import { type AccountInfo } from '@polkadot/types/interfaces';
import { type Codec } from '@polkadot/types/types';

import { validate } from '../../../src/renderer/shared/api/chain-verification';
import chains from '../../../src/renderer/shared/config/chains/chains.json';
import {
  type ChainJSON,
  type TestAccounts,
  TestAccountsURL,
  createWsConnection,
  getTestAccounts,
  prepareTestData,
} from '../utils';

const [_, polkadotParachains, kusamaParachains, polkadot, kusama] = prepareTestData(chains as ChainJSON[]);

/**
 * Data Verification integration tests
 *
 * @group integration
 * @group chain-verification/base
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

    expect(validationStatus).toEqual(true);
  });

  test.each(kusamaParachains)('Can verify data for kusama parachain: $name', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);
    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));
    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    const data = await parachainApi.query.system.account(parachainAccount?.account);
    const validationStatus = await validate(kusamaApi, parachainApi, storageKey, data);

    expect(validationStatus).toEqual(true);
  });

  test.each(kusamaParachains)('Verification return false if nonce was changed for $name', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);
    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));
    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    const data = (await parachainApi.query.system.account(parachainAccount?.account)) as AccountInfo;
    // changing nonce
    const new_nonce_value = data.data.free as Codec;
    data.set('nonce', new_nonce_value);

    const validationStatus = await validate(kusamaApi, parachainApi, storageKey, data);
    expect(validationStatus).toEqual(false);
  });

  test.each(polkadotParachains)('Verification return false if balance was changed for $name', async (parachain) => {
    const parachainApi = await createWsConnection(parachain.nodes[0].url);
    const parachainAccount = testAccounts.find((data) => data.chainId == parachain.chainId.slice(2));
    const storageKey = polkadotApi.query.system.account.key(parachainAccount?.account);

    const data = (await parachainApi.query.system.account(parachainAccount?.account)) as AccountInfo;
    // changing balance
    const new_balance_value = data.data.feeFrozen as Codec;
    data.data.set('free', new_balance_value);

    const validationStatus = await validate(polkadotApi, parachainApi, storageKey, data);
    expect(validationStatus).toEqual(false);
  });
});
