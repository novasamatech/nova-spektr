import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('graphql-request', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    GraphQLClient: vi.fn(function () {
      return {
        request: vi.fn().mockResolvedValue({ proxieds: { nodes: [] } }),
      };
    }),
  };
});

import { ConnectionStatus } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createProxiedAccount } from '@/shared/mocks';
import { accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { formModel } from '@/features/transfer/model/form-model';
import {
  assetHubChain,
  assetHubChainId,
  multisigAccount,
  multisigWallet,
  polkadotChain,
  polkadotChainId,
  proxiedWallet,
  vaultAssetHubKeyAccount,
  vaultPolkadotKeyAccount,
  vaultWallet,
} from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * "Myself" button behavior for XCM transfers (teleport) with key-set Polkadot
 * Vault wallets.
 *
 * Key-set vaults hold only chain-scoped derived keys (no universal/base
 * account), so signing-availability filtering leaves almost no accounts on the
 * destination chain. "Myself" must default to the sender address instead of an
 * arbitrary surviving account.
 *
 * @group integration
 * @group transfer
 */
describe('Transfer Form - Myself XCM destination', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  const buildEnv = async (accountsList = [vaultAssetHubKeyAccount, vaultPolkadotKeyAccount]) => {
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withChain(assetHubChain)
      .withChain(polkadotChain)
      .withConnectionStatus(assetHubChainId, ConnectionStatus.CONNECTED)
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
      .withStoreValue(accounts.__test.$list, accountsList)
      .withStoreValue(walletSelect.__test.$selectedWalletId, vaultWallet.id)
      .build();

    await seedAccountHandlers(env.scope);

    // Teleport: Asset Hub (origin) → Polkadot relay (destination)
    await env.executeEvent(formModel.formInitiated, {
      chain: assetHubChain,
      asset: assetHubChain.assets[0],
    });
    await allSettled(formModel.form.fields.destinationChain.change, {
      scope: env.scope,
      params: polkadotChain,
    });
  };

  describe('Myself button', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Transfer',
        feature: 'Transfer Form',
        story: 'Myself XCM destination',
      });
    });

    it('should fill the sender address on the destination chain', async () => {
      await buildEnv();

      await allSettled(formModel.form.fields.initiator.change, {
        scope: env.scope,
        params: vaultAssetHubKeyAccount,
      });

      await env.executeEventVoid(formModel.myselfClicked);

      // The sender's own key, not the unused Polkadot-derived key
      expect(env.getState(formModel.form.fields.destination.$value)).toBe(
        toAddress(vaultAssetHubKeyAccount.accountId, { prefix: polkadotChain.addressPrefix }),
      );
      expect(env.getState(formModel.$isMyselfXcmOpened)).toBe(false);
    });

    it('should be enabled even when no wallet account passes availability on the destination chain', async () => {
      // Only the Asset Hub key exists — nothing in the wallet is
      // signing-available on the Polkadot relay destination
      await buildEnv([vaultAssetHubKeyAccount]);

      await allSettled(formModel.form.fields.initiator.change, {
        scope: env.scope,
        params: vaultAssetHubKeyAccount,
      });

      expect(env.getState(formModel.$isMyselfXcmEnabled)).toBe(true);
    });

    it('should fall back to the single destination-chain account when there is no sender', async () => {
      await buildEnv();

      await allSettled(formModel.form.fields.initiator.change, {
        scope: env.scope,
        params: null,
      });

      await env.executeEventVoid(formModel.myselfClicked);

      expect(env.getState(formModel.form.fields.destination.$value)).toBe(
        toAddress(vaultPolkadotKeyAccount.accountId, { prefix: polkadotChain.addressPrefix }),
      );
    });

    it('should fill the multisig sender address when it is available on the destination chain', async () => {
      // Keyless senders go through the availability rule instead of the keyed
      // scheme match; a universal multisig passes the seeded handler, so the
      // sender shortcut applies just like for keyed accounts.
      env = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(assetHubChain)
        .withChain(polkadotChain)
        .withConnectionStatus(assetHubChainId, ConnectionStatus.CONNECTED)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(walletModel.__test.$rawWallets, [multisigWallet])
        .withStoreValue(accounts.__test.$list, [multisigAccount])
        .withStoreValue(walletSelect.__test.$selectedWalletId, multisigWallet.id)
        .build();

      await seedAccountHandlers(env.scope);

      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });
      await allSettled(formModel.form.fields.destinationChain.change, {
        scope: env.scope,
        params: assetHubChain,
      });
      await allSettled(formModel.form.fields.initiator.change, {
        scope: env.scope,
        params: multisigAccount,
      });

      expect(env.getState(formModel.$isMyselfXcmEnabled)).toBe(true);

      await env.executeEventVoid(formModel.myselfClicked);

      expect(env.getState(formModel.form.fields.destination.$value)).toBe(
        toAddress(multisigAccount.accountId, { prefix: assetHubChain.addressPrefix }),
      );
    });

    it('should keep Myself disabled for a keyless proxied sender on a foreign destination chain', async () => {
      // A proxied account exists only on its own chain — its address on the
      // destination chain is uncontrolled, so the sender shortcut must not
      // apply and no fallback accounts are available either.
      const proxiedAccount = createProxiedAccount('proxied-sender', proxiedWallet.id);

      env = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(assetHubChain)
        .withChain(polkadotChain)
        .withConnectionStatus(assetHubChainId, ConnectionStatus.CONNECTED)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(walletModel.__test.$rawWallets, [proxiedWallet])
        .withStoreValue(accounts.__test.$list, [proxiedAccount])
        .withStoreValue(walletSelect.__test.$selectedWalletId, proxiedWallet.id)
        .build();

      await seedAccountHandlers(env.scope);

      // Teleport: Polkadot relay (origin, where the proxy exists) → Asset Hub
      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });
      await allSettled(formModel.form.fields.destinationChain.change, {
        scope: env.scope,
        params: assetHubChain,
      });
      await allSettled(formModel.form.fields.initiator.change, {
        scope: env.scope,
        params: proxiedAccount,
      });

      expect(env.getState(formModel.$isMyselfXcmEnabled)).toBe(false);

      await env.executeEventVoid(formModel.myselfClicked);

      expect(env.getState(formModel.form.fields.destination.$value)).toBe('');
    });
  });
});
