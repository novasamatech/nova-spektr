import { type ApiPromise } from '@polkadot/api';
import { type Scope, allSettled, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId } from '@/shared/core';
import { type DecodedTransaction, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { AssetHubChains } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { authModel, connectionHistoryModel } from '@/aggregates/backend';
import { pathModel } from '@/features/signing-path';
import type * as DecodeDraft from '../lib/decode-draft-transaction';
import { decodeDraftTransaction } from '../lib/decode-draft-transaction';

import { type DraftSeed, DESCRIPTION_MAX_LENGTH, STEPS_ORDER, createDraftModel } from './create-draft-model';

vi.mock('../lib/decode-draft-transaction', async (importOriginal) => ({
  ...(await importOriginal<typeof DecodeDraft>()),
  decodeDraftTransaction: vi.fn(() => null),
}));

const acc = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });
const multisig = (accountId: AccountId): PathNode => ({ kind: 'multisig', accountId });

const CHAIN_A = `0x${'aa'.repeat(32)}` as ChainId;
const CHAIN_B = `0x${'bb'.repeat(32)}` as ChainId;

// `sortChains` (behind `$chainsList`) only reads name / options / chainId / parentId.
const makeChain = (chainId: ChainId, name: string): Chain =>
  ({ chainId, name, parentId: undefined, options: [] }) as unknown as Chain;

const chainA = makeChain(CHAIN_A, 'Chain A');
const chainB = makeChain(CHAIN_B, 'Chain B');
const polkadotAssetHub = makeChain(AssetHubChains.POLKADOT_AH, 'Polkadot Asset Hub');

const forkWithChains = (chains: Chain[]) =>
  fork({
    values: new Map().set(networkModel.$chains, Object.fromEntries(chains.map((chain) => [chain.chainId, chain]))),
  });

const VALID_CALL_DATA = '0xdeadbeef';
const COMPLETE_PATH: PathNode[] = [multisig(acc(1)), signer(acc(2))];

const open = (scope: Scope, seed?: DraftSeed) =>
  allSettled(createDraftModel.createDraftRequested, { scope, params: seed });

describe('createDraftModel · step progression', () => {
  it('opens on call-data and walks forward through STEPS_ORDER, capped at confirm', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope);
    expect(scope.getState(createDraftModel.$isOpen)).toBe(true);
    expect(scope.getState(createDraftModel.$activeStep)).toBe(STEPS_ORDER[0]);

    await allSettled(createDraftModel.stepAdvanced, { scope });
    expect(scope.getState(createDraftModel.$activeStep)).toBe(STEPS_ORDER[1]);

    await allSettled(createDraftModel.stepAdvanced, { scope });
    expect(scope.getState(createDraftModel.$activeStep)).toBe(STEPS_ORDER[2]);

    // Advancing past the last step is a no-op.
    await allSettled(createDraftModel.stepAdvanced, { scope });
    expect(scope.getState(createDraftModel.$activeStep)).toBe('confirm');
  });

  it('walks backward on stepReverted and stops at call-data', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope);
    await allSettled(createDraftModel.stepAdvanced, { scope });
    await allSettled(createDraftModel.stepAdvanced, { scope });

    await allSettled(createDraftModel.stepReverted, { scope });
    expect(scope.getState(createDraftModel.$activeStep)).toBe('select-path');

    await allSettled(createDraftModel.stepReverted, { scope });
    expect(scope.getState(createDraftModel.$activeStep)).toBe('call-data');

    // Reverting past the first step is a no-op.
    await allSettled(createDraftModel.stepReverted, { scope });
    expect(scope.getState(createDraftModel.$activeStep)).toBe('call-data');
  });

  it('modalClosed resets every field and the seeded signing path', async () => {
    const scope = forkWithChains([chainA, chainB]);

    await open(scope, {
      chainId: CHAIN_A,
      callData: VALID_CALL_DATA,
      path: COMPLETE_PATH,
      description: 'planned payout',
      inputMode: 'build',
    });
    expect(scope.getState(createDraftModel.$activeStep)).toBe('confirm');
    expect(scope.getState(pathModel.$path)).toEqual(COMPLETE_PATH);

    await allSettled(createDraftModel.modalClosed, { scope });

    expect(scope.getState(createDraftModel.$isOpen)).toBe(false);
    expect(scope.getState(createDraftModel.$activeStep)).toBe('call-data');
    expect(scope.getState(createDraftModel.$callData)).toBe('');
    expect(scope.getState(createDraftModel.$description)).toBe('');
    expect(scope.getState(createDraftModel.$inputMode)).toBe('paste');
    expect(scope.getState(createDraftModel.$selectedChain)).toBeNull();
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });
});

describe('createDraftModel · default chain selection', () => {
  it('defaults to Polkadot Asset Hub when it is known', async () => {
    const scope = forkWithChains([chainA, polkadotAssetHub]);

    await open(scope);

    expect(scope.getState(createDraftModel.$selectedChain)?.chainId).toBe(AssetHubChains.POLKADOT_AH);
  });

  it('falls back to the first chain of the sorted list when Asset Hub is missing', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope);

    expect(scope.getState(createDraftModel.$selectedChain)?.chainId).toBe(CHAIN_A);
  });

  it('resolves the seeded chainId against known chains', async () => {
    const scope = forkWithChains([chainA, chainB, polkadotAssetHub]);

    await open(scope, { chainId: CHAIN_B });

    expect(scope.getState(createDraftModel.$selectedChain)?.chainId).toBe(CHAIN_B);
  });
});

describe('createDraftModel · skipPressed', () => {
  it('advances to select-path and clears whatever call data was typed (late-fill later)', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope);
    await allSettled(createDraftModel.callDataChanged, { scope, params: VALID_CALL_DATA });

    await allSettled(createDraftModel.skipPressed, { scope });

    expect(scope.getState(createDraftModel.$activeStep)).toBe('select-path');
    expect(scope.getState(createDraftModel.$callData)).toBe('');
  });

  it('$canSkip is available only on the call-data step with a chain selected', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope);
    expect(scope.getState(createDraftModel.$canSkip)).toBe(true);

    await allSettled(createDraftModel.skipPressed, { scope });
    expect(scope.getState(createDraftModel.$canSkip)).toBe(false);
  });

  it('$canSkip stays off without a selected chain', async () => {
    const scope = forkWithChains([]);

    await open(scope);

    expect(scope.getState(createDraftModel.$selectedChain)).toBeNull();
    expect(scope.getState(createDraftModel.$canSkip)).toBe(false);
  });
});

describe('createDraftModel · description length', () => {
  it('$isDescriptionTooLong flips strictly above DESCRIPTION_MAX_LENGTH, value itself is not truncated', async () => {
    const scope = fork();

    await allSettled(createDraftModel.descriptionChanged, { scope, params: 'a'.repeat(DESCRIPTION_MAX_LENGTH) });
    expect(scope.getState(createDraftModel.$isDescriptionTooLong)).toBe(false);

    await allSettled(createDraftModel.descriptionChanged, { scope, params: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1) });
    expect(scope.getState(createDraftModel.$isDescriptionTooLong)).toBe(true);
    expect(scope.getState(createDraftModel.$description)).toHaveLength(DESCRIPTION_MAX_LENGTH + 1);
  });

  it('$canContinue on confirm requires a non-blank description within the limit', async () => {
    const scope = fork({ values: new Map().set(createDraftModel.$activeStep, 'confirm') });

    expect(scope.getState(createDraftModel.$canContinue)).toBe(false);

    await allSettled(createDraftModel.descriptionChanged, { scope, params: '   ' });
    expect(scope.getState(createDraftModel.$canContinue)).toBe(false);

    await allSettled(createDraftModel.descriptionChanged, { scope, params: 'a'.repeat(DESCRIPTION_MAX_LENGTH) });
    expect(scope.getState(createDraftModel.$canContinue)).toBe(true);

    await allSettled(createDraftModel.descriptionChanged, { scope, params: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1) });
    expect(scope.getState(createDraftModel.$canContinue)).toBe(false);
  });
});

describe('createDraftModel · inputModeChanged', () => {
  it('switches paste ↔ build without touching call data, chain or step', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope);
    await allSettled(createDraftModel.callDataChanged, { scope, params: VALID_CALL_DATA });

    await allSettled(createDraftModel.inputModeChanged, { scope, params: 'build' });

    expect(scope.getState(createDraftModel.$inputMode)).toBe('build');
    expect(scope.getState(createDraftModel.$callData)).toBe(VALID_CALL_DATA);
    expect(scope.getState(createDraftModel.$activeStep)).toBe('call-data');
    expect(scope.getState(createDraftModel.$selectedChain)?.chainId).toBe(CHAIN_A);

    await allSettled(createDraftModel.inputModeChanged, { scope, params: 'paste' });
    expect(scope.getState(createDraftModel.$inputMode)).toBe('paste');
  });
});

describe('createDraftModel · call data validation', () => {
  it('non-hex input raises the hex error and blocks continue; valid hex clears it', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope);

    await allSettled(createDraftModel.callDataChanged, { scope, params: 'not-hex' });
    expect(scope.getState(createDraftModel.$callDataErrorKey)).toBe('operations.drafts.callDataErrorHex');
    expect(scope.getState(createDraftModel.$canContinue)).toBe(false);

    await allSettled(createDraftModel.callDataChanged, { scope, params: VALID_CALL_DATA });
    expect(scope.getState(createDraftModel.$callDataErrorKey)).toBeNull();
    expect(scope.getState(createDraftModel.$canContinue)).toBe(true);
  });
});

describe('createDraftModel · chainSelected', () => {
  it('clears entered call data and resets a committed signing path', async () => {
    const scope = forkWithChains([chainA, chainB]);

    await open(scope);
    await allSettled(createDraftModel.callDataChanged, { scope, params: VALID_CALL_DATA });
    await allSettled(pathModel.pathSeeded, { scope, params: COMPLETE_PATH });

    await allSettled(createDraftModel.chainSelected, { scope, params: chainB });

    expect(scope.getState(createDraftModel.$selectedChain)?.chainId).toBe(CHAIN_B);
    expect(scope.getState(createDraftModel.$callData)).toBe('');
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });
});

describe('createDraftModel · seed jump-ahead', () => {
  it('chain + valid call data + complete path opens straight on confirm with everything prefilled', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope, {
      chainId: CHAIN_A,
      callData: VALID_CALL_DATA,
      path: COMPLETE_PATH,
      description: 'from transfer form',
      inputMode: 'build',
    });

    expect(scope.getState(createDraftModel.$isOpen)).toBe(true);
    expect(scope.getState(createDraftModel.$activeStep)).toBe('confirm');
    expect(scope.getState(createDraftModel.$callData)).toBe(VALID_CALL_DATA);
    expect(scope.getState(createDraftModel.$selectedChain)?.chainId).toBe(CHAIN_A);
    expect(scope.getState(createDraftModel.$description)).toBe('from transfer form');
    expect(scope.getState(createDraftModel.$inputMode)).toBe('build');
    expect(scope.getState(pathModel.$path)).toEqual(COMPLETE_PATH);
  });

  it('chain + valid call data without a path opens on select-path', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope, { chainId: CHAIN_A, callData: VALID_CALL_DATA });

    expect(scope.getState(createDraftModel.$activeStep)).toBe('select-path');
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });

  it('a path not ending on a signer is incomplete — opens on select-path and is not seeded', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope, { chainId: CHAIN_A, callData: VALID_CALL_DATA, path: [multisig(acc(1))] });

    expect(scope.getState(createDraftModel.$activeStep)).toBe('select-path');
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });

  it('call data without a chain opens on call-data', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope, { callData: VALID_CALL_DATA });

    expect(scope.getState(createDraftModel.$activeStep)).toBe('call-data');
    expect(scope.getState(createDraftModel.$callData)).toBe(VALID_CALL_DATA);
  });

  it('invalid (non-hex) seeded call data opens on call-data even with a chain', async () => {
    const scope = forkWithChains([chainA]);

    await open(scope, { chainId: CHAIN_A, callData: 'not-hex', path: COMPLETE_PATH });

    expect(scope.getState(createDraftModel.$activeStep)).toBe('call-data');
  });
});

describe('createDraftModel · unknown recipient acknowledgement', () => {
  it('starts unacknowledged and follows the toggle', async () => {
    const scope = forkWithChains([chainA]);
    await open(scope);

    expect(scope.getState(createDraftModel.$isRiskAcknowledged)).toBe(false);

    await allSettled(createDraftModel.riskAcknowledgedToggled, { scope, params: true });
    expect(scope.getState(createDraftModel.$isRiskAcknowledged)).toBe(true);

    await allSettled(createDraftModel.riskAcknowledgedToggled, { scope, params: false });
    expect(scope.getState(createDraftModel.$isRiskAcknowledged)).toBe(false);
  });

  it('resets when the call data changes (the recipient may have changed)', async () => {
    const scope = forkWithChains([chainA]);
    await open(scope);
    await allSettled(createDraftModel.riskAcknowledgedToggled, { scope, params: true });

    await allSettled(createDraftModel.callDataChanged, { scope, params: VALID_CALL_DATA });
    expect(scope.getState(createDraftModel.$isRiskAcknowledged)).toBe(false);
  });

  it('resets when the chain changes', async () => {
    const scope = forkWithChains([chainA, chainB]);
    await open(scope);
    await allSettled(createDraftModel.riskAcknowledgedToggled, { scope, params: true });

    await allSettled(createDraftModel.chainSelected, { scope, params: chainB });
    expect(scope.getState(createDraftModel.$isRiskAcknowledged)).toBe(false);
  });

  it('resets when the modal closes and when a new flow opens', async () => {
    const scope = forkWithChains([chainA]);
    await open(scope);
    await allSettled(createDraftModel.riskAcknowledgedToggled, { scope, params: true });

    await allSettled(createDraftModel.modalClosed, { scope });
    expect(scope.getState(createDraftModel.$isRiskAcknowledged)).toBe(false);

    await allSettled(createDraftModel.riskAcknowledgedToggled, { scope, params: true });
    await open(scope, { chainId: CHAIN_A, callData: VALID_CALL_DATA, path: COMPLETE_PATH });
    expect(scope.getState(createDraftModel.$isRiskAcknowledged)).toBe(false);
  });
});

describe('createDraftModel · unknown recipient gate', () => {
  const STRANGER = acc(9);
  const transferToStranger = {
    type: TransactionType.TRANSFER,
    section: 'balances',
    method: 'transferKeepAlive',
    chainId: CHAIN_A,
    address: '',
    args: { dest: STRANGER, value: '1' },
  } as unknown as DecodedTransaction;
  const healthyBook = { accountId: acc(8), accountName: 'Backend user', permissions: [] };
  const seed: DraftSeed = { chainId: CHAIN_A, callData: VALID_CALL_DATA, path: COMPLETE_PATH };

  const forkConnected = (withApi: boolean) =>
    fork({
      values: new Map()
        .set(networkModel.$chains, { [CHAIN_A]: chainA })
        .set(networkModel.$apis, withApi ? { [CHAIN_A]: {} as ApiPromise } : {})
        .set(connectionHistoryModel.$hasEverConnected, true)
        .set(authModel.$authState, healthyBook),
    });

  beforeEach(() => {
    vi.mocked(decodeDraftTransaction).mockReset();
    vi.mocked(decodeDraftTransaction).mockReturnValue(null);
  });

  it('blocks Create for an unknown recipient until acknowledged', async () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(transferToStranger);
    const scope = forkConnected(true);
    await open(scope, seed);

    expect(scope.getState(createDraftModel.$destinationAccountId)).toBe(STRANGER);
    expect(scope.getState(createDraftModel.$recipientWarning)).toBe('unknown');
    expect(scope.getState(createDraftModel.$recipientRiskAccepted)).toBe(false);

    await allSettled(createDraftModel.riskAcknowledgedToggled, { scope, params: true });
    expect(scope.getState(createDraftModel.$recipientRiskAccepted)).toBe(true);
  });

  it('accepts a draft with no recipient to check', async () => {
    const scope = forkConnected(true);
    await open(scope, seed);

    expect(scope.getState(createDraftModel.$destinationAccountId)).toBeNull();
    expect(scope.getState(createDraftModel.$recipientWarning)).toBe('none');
    expect(scope.getState(createDraftModel.$recipientRiskAccepted)).toBe(true);
  });

  it('never treats "cannot check yet" as safe: no chain api + call data blocks Create even when ticked', async () => {
    const scope = forkConnected(false);
    await open(scope, seed);

    expect(scope.getState(createDraftModel.$isRecipientCheckable)).toBe(false);
    expect(scope.getState(createDraftModel.$recipientRiskAccepted)).toBe(false);

    await allSettled(createDraftModel.riskAcknowledgedToggled, { scope, params: true });
    expect(scope.getState(createDraftModel.$recipientRiskAccepted)).toBe(false);
  });

  it('does not require the chain api while recipient verification is off', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, { [CHAIN_A]: chainA }).set(networkModel.$apis, {}),
    });
    await open(scope, seed);

    expect(scope.getState(createDraftModel.$isRecipientCheckable)).toBe(true);
    expect(scope.getState(createDraftModel.$recipientRiskAccepted)).toBe(true);
  });
});
