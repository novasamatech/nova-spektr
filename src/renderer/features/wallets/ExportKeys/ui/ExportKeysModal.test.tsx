import { act, fireEvent, render, screen } from '@testing-library/react';
import { allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { vi } from 'vitest';

import {
  type PolkadotVaultWallet,
  type VaultChainAccount,
  AccountType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { exportKeysUtils } from '../lib/export-keys-utils';

import { ExportKeysModal } from './ExportKeysModal';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({ t: (key: string) => key }),
}));

// Both draw to a canvas, which jsdom has no context for. Neither is relevant
// here — the QR payload is built from the same account list the file export
// receives, so asserting on the latter covers both.
vi.mock('@/entities/transaction', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  QrTxGenerator: () => null,
  OperationResult: () => null,
}));

const testChain = polkadotAssetHubChain;

const testWallet = {
  id: 1,
  type: WalletType.POLKADOT_VAULT,
  isActive: true,
  name: 'test vault',
  rootAccountId: TEST_ACCOUNTS[0],
  signingType: SigningType.POLKADOT_VAULT,
  // Deliberately stale: mirrors the snapshot the wallet details modal holds.
  accounts: [],
} as unknown as PolkadotVaultWallet;

// accountId must differ per account — accountService.uniqId keys on
// walletId + accountId + chainId, and equal ids would collapse into one.
function createChainAccount(id: string, accountId: AccountId, derivationPath: string): VaultChainAccount {
  return {
    id,
    walletId: testWallet.id,
    name: derivationPath,
    type: 'chain',
    accountType: AccountType.CHAIN,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    accountId,
    chainId: testChain.chainId,
    derivationPath,
  } as unknown as VaultChainAccount;
}

const existingAccount = createChainAccount('1', TEST_ACCOUNTS[1], '//polkadot');
const addedAccount = createChainAccount('2', TEST_ACCOUNTS[2], '//polkadot//staking');

/** Derivation paths the export was actually handed. */
function getExportedPaths(spy: ReturnType<typeof vi.spyOn>): string[] {
  const lastCall = spy.mock.calls.at(-1);
  const exported = (lastCall?.[2] ?? []) as VaultChainAccount[];

  return exported.flat().map((account) => account.derivationPath);
}

describe('features/wallets/ExportKeys/ui/ExportKeysModal', () => {
  it('exports derivations added after the wallet details modal was opened', async () => {
    const exportSpy = vi.spyOn(exportKeysUtils, 'exportVaultWallet').mockImplementation(() => {});

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { [testChain.chainId]: testChain })
        .set(accounts.__test.$list, [existingAccount]),
      handlers: new Map().set(accounts.createAccounts, (newAccounts: VaultChainAccount[]) => newAccounts),
    });

    render(
      <Provider value={scope}>
        <ExportKeysModal wallet={testWallet}>
          <button>open</button>
        </ExportKeysModal>
      </Provider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText('open'));
    });

    fireEvent.click(screen.getByText('dynamicDerivations.exportKeys.downloadButton'));
    expect(getExportedPaths(exportSpy)).toEqual(['//polkadot']);

    // The new derivation lands in accounts.$list, exactly as it does after
    // signing a key-set change with the Vault — without the modal remounting.
    await act(async () => {
      await allSettled(accounts.createAccounts, { scope, params: [addedAccount] });
    });

    fireEvent.click(screen.getByText('dynamicDerivations.exportKeys.downloadButton'));
    expect(getExportedPaths(exportSpy)).toEqual(['//polkadot', '//polkadot//staking']);
  });
});
