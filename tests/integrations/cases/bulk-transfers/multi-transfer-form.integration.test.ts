import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
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

import { ConnectionStatus, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type PathNode } from '@/domains/backend';
import { type Extrinsic, accounts, transactionService } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { MultiTransferCsvError, MultiTransferFieldError, MultiTransferFieldWarning } from '@/entities/multi-transfer';
import { getExtrinsic } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { formModel } from '@/features/multi-transfer/model/form';
import { seedDiHandlers } from '@/features/multisig-operations/model/test-helpers';
import {
  kusamaChain,
  polkadotChain,
  polkadotChainId,
  senderAccount,
  senderBalance,
  vaultWallet,
} from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

// Same valid/invalid SS58 fixtures as src/renderer/features/multi-transfer/utils.test.ts
const ADDRESS_1 = '5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9';
const ADDRESS_2 = '16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD';
const ADDRESS_3 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const INVALID_CHECKSUM_ADDRESS = '16fL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD';

const csvFile = (content: string, name = 'transfers.csv') => new File([content], name, { type: 'text/csv' });

const VALID_CSV = `recipient,amount\n${ADDRESS_1},1000000000000\n${ADDRESS_2},2000000000000\n`;
const MIXED_CSV = `recipient,amount\n${ADDRESS_1},1000000000000\n${INVALID_CHECKSUM_ADDRESS},2000000000000\n${ADDRESS_2},not-a-number\n`;

/**
 * Integration tests for the multi-transfer CSV form model wiring
 * (`features/multi-transfer/model/form.ts`).
 *
 * CSV parsing rules themselves are covered by unit tests in
 * `features/multi-transfer/utils.test.ts` — here we test how the form model
 * routes parse/validation results into its stores:
 *
 * - Valid upload → rows land in `$parsedCsv` + `form.fields.transfers`
 * - Row issues → `$csvIssues`, submit gated
 * - Structural failures → `$csvError`, no rows
 * - Chain change / re-upload → previous rows and issues discarded
 *
 * @group integration
 * @group multi-transfer
 */
describe('Multi-transfer Form - CSV Model Wiring', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  /**
   * Common setup: connected Polkadot chain, vault wallet with a funded sender
   * account, and the chain field selected (CSV validation requires a chain).
   */
  async function createEnv(): Promise<FeatureTestEnvironment> {
    const testEnv = await new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotChain)
      .withChain(kusamaChain)
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
      .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
      .withStoreValue(accounts.__test.$list, [senderAccount])
      .build();

    await allSettled(formModel.form.fields.chain.change, {
      scope: testEnv.scope,
      params: polkadotChain,
    });

    return testEnv;
  }

  const hasBlockingCsvState = () => {
    const csvError = env.getState(formModel.$csvError);
    const csvIssues = env.getState(formModel.$csvIssues);

    return csvError !== null || Boolean(csvIssues?.some((issue) => issue.severity === 'error'));
  };

  describe('Valid CSV upload', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Operations',
        feature: 'MultiTransfer',
        story: 'Valid CSV upload',
      });
    });

    it('should land parsed rows in form stores with no blocking issues', async () => {
      env = await createEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));

      expect(env.getState(formModel.$fileName)).toBe('transfers.csv');
      expect(env.getState(formModel.$csvError)).toBeNull();
      expect(env.getState(formModel.$csvIssues)).toEqual([]);

      // Parsed rows land both in $parsedCsv and the form's transfers field
      const parsedCsv = env.getState(formModel.$parsedCsv);
      expect(parsedCsv).toHaveLength(2);
      expect(parsedCsv?.[0]?.recipient.parsed).toBe(toAccountId(ADDRESS_1));
      expect(parsedCsv?.[0]?.amount.parsed?.toString()).toBe('1000000000000');
      expect(parsedCsv?.[1]?.recipient.parsed).toBe(toAccountId(ADDRESS_2));
      expect(parsedCsv?.[1]?.amount.parsed?.toString()).toBe('2000000000000');

      const transfers = env.getState(formModel.form.fields.transfers.$value);
      expect(transfers).toEqual(parsedCsv);

      // Whole-file total is derived from the parsed rows
      expect(env.getState(formModel.$amount).toString()).toBe('3000000000000');

      // CSV gate is open: nothing CSV-related blocks continue/submit.
      // ($canSubmit itself also needs a computed fee, which requires a live
      // API the harness does not provide — so we assert the CSV gate parts.)
      expect(hasBlockingCsvState()).toBe(false);
    });

    it('should build the batch transaction from parsed rows once a signatory is set', async () => {
      env = await createEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));

      await allSettled(formModel.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });
      await allSettled(formModel.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      const coreTx = env.getState(formModel.$coreTx);
      expect(coreTx).not.toBeNull();
      expect(coreTx?.type).toBe(TransactionType.BATCH_ALL);
      expect(coreTx?.chainId).toBe(polkadotChainId);
      expect(coreTx?.accountId).toBe(senderAccount.accountId);
      expect(coreTx?.args.transactions).toHaveLength(2);
      expect(coreTx?.args.transactions[0].args.dest).toBe(toAccountId(ADDRESS_1));
      expect(coreTx?.args.transactions[0].args.value).toBe('1000000000000');
    });
  });

  describe('CSV with invalid rows', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Operations',
        feature: 'MultiTransfer',
        story: 'CSV with invalid rows',
      });
    });

    it('should populate issues and gate submission for bad address and amount rows', async () => {
      env = await createEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(MIXED_CSV));

      // Structurally the file is fine — errors are per-row issues
      expect(env.getState(formModel.$csvError)).toBeNull();

      const issues = env.getState(formModel.$csvIssues);
      expect(issues).toContainEqual({
        row: 2,
        path: 'recipient',
        severity: 'error',
        message: MultiTransferFieldError.INVALID_SS58_ADDRESS,
      });
      expect(issues).toContainEqual({
        row: 3,
        path: 'amount',
        severity: 'error',
        message: MultiTransferFieldError.INVALID_VALUE,
      });

      // Rows still land in the stores (bad fields parse to null) so the UI
      // can render the failing rows
      const parsedCsv = env.getState(formModel.$parsedCsv);
      expect(parsedCsv).toHaveLength(3);
      expect(parsedCsv?.[0]?.recipient.parsed).toBe(toAccountId(ADDRESS_1));
      expect(parsedCsv?.[1]?.recipient.parsed).toBeNull();
      expect(parsedCsv?.[2]?.amount.parsed).toBeNull();

      // Error-severity issues close the submit gate
      expect(hasBlockingCsvState()).toBe(true);
      expect(env.getState(formModel.$canSubmit)).toBe(false);
    });

    it('should flag duplicate recipients as warnings that do not block the CSV gate', async () => {
      env = await createEnv();

      const file = csvFile(`recipient,amount\n${ADDRESS_1},1000000000000\n${ADDRESS_1},2000000000000\n`);
      await env.executeEvent(formModel.fileUploaded, file);

      expect(env.getState(formModel.$csvError)).toBeNull();
      expect(env.getState(formModel.$csvIssues)).toContainEqual({
        row: 2,
        path: 'recipient',
        severity: 'warning',
        message: MultiTransferFieldWarning.DUPLICATE_RECIPIENT,
      });

      // Warnings never block submit
      expect(hasBlockingCsvState()).toBe(false);
      expect(env.getState(formModel.form.fields.transfers.$value)).toHaveLength(2);
    });
  });

  describe('Structural failures', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Operations',
        feature: 'MultiTransfer',
        story: 'Structural failures',
      });
    });

    it('should reject a file with a missing column with STRUCTURE and no rows', async () => {
      env = await createEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(`recipient\n${ADDRESS_1}\n`));

      expect(env.getState(formModel.$csvError)).toBe(MultiTransferCsvError.STRUCTURE);
      expect(env.getState(formModel.$parsedCsvRaw)).toBeNull();
      expect(env.getState(formModel.$parsedCsv)).toBeNull();
      expect(env.getState(formModel.form.fields.transfers.$value)).toEqual([]);
      expect(hasBlockingCsvState()).toBe(true);
    });

    it('should reject an empty file with STRUCTURE', async () => {
      env = await createEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(''));

      expect(env.getState(formModel.$csvError)).toBe(MultiTransferCsvError.STRUCTURE);
      expect(env.getState(formModel.$parsedCsv)).toBeNull();
      expect(env.getState(formModel.form.fields.transfers.$value)).toEqual([]);
    });

    it('should mark a headers-only file as EMPTY without producing rows', async () => {
      env = await createEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile('recipient,amount\n'));

      expect(env.getState(formModel.$csvError)).toBe(MultiTransferCsvError.EMPTY);
      // Parsing succeeded (zero rows), but validation is never started
      expect(env.getState(formModel.$parsedCsvRaw)).toEqual([]);
      expect(env.getState(formModel.$parsedCsv)).toBeNull();
      expect(env.getState(formModel.form.fields.transfers.$value)).toEqual([]);
      expect(hasBlockingCsvState()).toBe(true);
    });
  });

  describe('CSV discard on chain change', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Operations',
        feature: 'MultiTransfer',
        story: 'CSV discard on chain change',
      });
    });

    it('should discard parsed rows and issues when the network changes', async () => {
      env = await createEnv();

      // Upload a file that produces both rows and issues
      await env.executeEvent(formModel.fileUploaded, csvFile(MIXED_CSV));
      expect(env.getState(formModel.$parsedCsv)).toHaveLength(3);
      expect(env.getState(formModel.$csvIssues)?.length).toBeGreaterThan(0);

      await allSettled(formModel.form.fields.chain.change, {
        scope: env.scope,
        params: kusamaChain,
      });

      // Everything validated against the previous chain is discarded
      expect(env.getState(formModel.$fileName)).toBeNull();
      expect(env.getState(formModel.$parsedCsvRaw)).toBeNull();
      expect(env.getState(formModel.$parsedCsv)).toBeNull();
      expect(env.getState(formModel.$csvIssues)).toBeNull();
      expect(env.getState(formModel.$csvError)).toBeNull();
      expect(env.getState(formModel.form.fields.transfers.$value)).toEqual([]);
    });
  });

  describe('CSV re-upload', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Operations',
        feature: 'MultiTransfer',
        story: 'CSV re-upload',
      });
    });

    it('should replace previous rows and issues with the new file contents', async () => {
      env = await createEnv();

      // First file: 3 rows, 2 of them broken
      await env.executeEvent(formModel.fileUploaded, csvFile(MIXED_CSV, 'first.csv'));
      expect(env.getState(formModel.$fileName)).toBe('first.csv');
      expect(env.getState(formModel.$parsedCsv)).toHaveLength(3);
      expect(hasBlockingCsvState()).toBe(true);

      // Second file: a single clean row
      const secondFile = csvFile(`recipient,amount\n${ADDRESS_3},5000000000000\n`, 'second.csv');
      await env.executeEvent(formModel.fileUploaded, secondFile);

      expect(env.getState(formModel.$fileName)).toBe('second.csv');
      expect(env.getState(formModel.$csvError)).toBeNull();
      expect(env.getState(formModel.$csvIssues)).toEqual([]);

      const transfers = env.getState(formModel.form.fields.transfers.$value);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]?.recipient.parsed).toBe(toAccountId(ADDRESS_3));
      expect(env.getState(formModel.$amount).toString()).toBe('5000000000000');
      expect(hasBlockingCsvState()).toBe(false);
    });

    it('should clear a previous structural error when a valid file is uploaded', async () => {
      env = await createEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(''));
      expect(env.getState(formModel.$csvError)).toBe(MultiTransferCsvError.STRUCTURE);

      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));

      expect(env.getState(formModel.$csvError)).toBeNull();
      expect(env.getState(formModel.$parsedCsv)).toHaveLength(2);
      expect(hasBlockingCsvState()).toBe(false);
    });
  });

  describe('Batch weight check', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Operations',
        feature: 'MultiTransfer',
        story: 'Batch weight check',
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // Only the seams the weight check crosses are stubbed: wrapping (needs a
    // live chain), extrinsic construction and the weight RPC itself.
    const fakeApi = { genesisHash: { toHex: () => polkadotChainId } } as unknown as ApiPromise;

    async function createWeightEnv(): Promise<FeatureTestEnvironment> {
      vi.spyOn(transactionService, 'wrapLegacyTransaction').mockImplementation(async (tx) => tx);
      vi.spyOn(transactionService, 'getSplitExtrinsicFee').mockResolvedValue(new BN(1));
      vi.spyOn(getExtrinsic, TransactionType.BATCH_ALL).mockReturnValue({} as unknown as Extrinsic);

      const testEnv = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withChain(kusamaChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withApi(polkadotChainId, fakeApi)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount])
        .build();

      await allSettled(formModel.form.fields.chain.change, { scope: testEnv.scope, params: polkadotChain });
      await allSettled(formModel.form.fields.initiator.change, { scope: testEnv.scope, params: senderAccount });
      await allSettled(formModel.form.fields.signatory.change, { scope: testEnv.scope, params: senderAccount });

      return testEnv;
    }

    it('should report how many rows fit and count only valid rows', async () => {
      const capacity = vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(1);
      env = await createWeightEnv();

      // Two valid rows and two broken ones: the batch carries only the valid two.
      await env.executeEvent(formModel.fileUploaded, csvFile(MIXED_CSV.replace(/\n$/, `\n${ADDRESS_3},3\n`)));

      await env.waitForState(formModel.$maxRowsPerTransaction, (maxRows) => maxRows === 1);
      expect(capacity).toHaveBeenLastCalledWith(expect.anything(), fakeApi, 2);
    });

    // `$canSubmit` also waits for the tx validator: its fee quote and call
    // encoding need a live chain, and its signer check reads DI handlers that
    // a forked scope starts without. Stub those seams on top of the weight env.
    const stubSubmitSeams = async (testEnv: FeatureTestEnvironment) => {
      vi.spyOn(transactionService, 'getTransactionFee').mockResolvedValue(new BN(1));
      vi.spyOn(getExtrinsic, TransactionType.BATCH_ALL).mockReturnValue({
        method: { toHex: () => '0x00' },
      } as unknown as Extrinsic);
      await seedDiHandlers(testEnv.scope);
    };

    it('SP-53: signs a file that fits as one batch and keeps Continue available', async () => {
      vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(1000);
      env = await createWeightEnv();
      await stubSubmitSeams(env);

      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));
      await env.waitForState(formModel.$canSubmit, (canSubmit) => canSubmit);

      const coreTx = env.getState(formModel.$coreTx);
      expect(coreTx?.type).toBe(TransactionType.BATCH_ALL);
      expect(coreTx?.args.transactions).toHaveLength(2);
      expect(env.getState(formModel.$maxRowsPerTransaction)).toBeNull();
      expect(env.getState(formModel.$batchCapacityCheckFailed)).toBe(false);
    });

    it('SP-54: blocks Continue with the number of rows that fit until the file is trimmed to it', async () => {
      const capacity = vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(1);
      env = await createWeightEnv();
      await stubSubmitSeams(env);

      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));
      await env.waitForState(formModel.$maxRowsPerTransaction, (maxRows) => maxRows === 1);
      // Only the batch verdict holds Continue back: the form and the transaction are valid.
      await env.waitForState(formModel.$isTxValid, (valid) => valid);
      expect(env.getState(formModel.form.$isValid)).toBe(true);
      expect(env.getState(formModel.$canSubmit)).toBe(false);

      // Trimmed to the reported row count: the error is gone and the flow proceeds.
      capacity.mockResolvedValue(1000);
      await env.executeEvent(formModel.fileUploaded, csvFile(`recipient,amount\n${ADDRESS_1},1000000000000\n`));
      await env.waitForState(formModel.$canSubmit, (canSubmit) => canSubmit);
      expect(env.getState(formModel.$maxRowsPerTransaction)).toBeNull();
    });

    it('SP-54: reports that not even one row fits', async () => {
      vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(0);
      env = await createWeightEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));
      await env.waitForState(formModel.$maxRowsPerTransaction, (maxRows) => maxRows === 0);
      expect(env.getState(formModel.$canSubmit)).toBe(false);
    });

    it('should drop a failed check once the network changes', async () => {
      vi.spyOn(transactionService, 'getBatchCapacity').mockRejectedValue(new Error('rpc down'));
      env = await createWeightEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));
      await env.waitForState(formModel.$batchCapacityCheckFailed, (failed) => failed);

      await allSettled(formModel.form.fields.chain.change, { scope: env.scope, params: kusamaChain });

      expect(env.getState(formModel.$batchCapacityCheckFailed)).toBe(false);
      expect(env.getState(formModel.$maxRowsPerTransaction)).toBeNull();
    });
  });

  describe('Draft mode weight check', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Operations',
        feature: 'MultiTransfer',
        story: 'Draft mode weight check',
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const fakeApi = { genesisHash: { toHex: () => polkadotChainId } } as unknown as ApiPromise;

    // A draft is authored along an address-book path, from a source account the
    // wallet does not hold — no initiator, no signatory, so the signing-side
    // transaction never exists and the weight check can only be fed the draft call.
    const draftPath: PathNode[] = [
      { kind: 'multisig', accountId: createAccountId('draft-contact-multisig') },
      { kind: 'signer', accountId: createAccountId('draft-contact-signer') },
    ];

    async function createDraftWeightEnv(): Promise<FeatureTestEnvironment> {
      // The draft's call data is read off the same extrinsic the weight check
      // builds; `method.toHex` is all the form asks of it.
      vi.spyOn(getExtrinsic, TransactionType.BATCH_ALL).mockReturnValue({
        method: { toHex: () => '0xabcd' },
      } as unknown as Extrinsic);

      const testEnv = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withChain(kusamaChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withApi(polkadotChainId, fakeApi)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount])
        .build();

      await allSettled(formModel.form.fields.chain.change, { scope: testEnv.scope, params: polkadotChain });

      return testEnv;
    }

    it('SP-58: weighs the draft call once the draft path is complete, and lets a fitting file be saved', async () => {
      const capacity = vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(1000);
      env = await createDraftWeightEnv();

      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));

      // Outside draft mode nothing is weighed: without a signatory there is no
      // signing transaction, and the draft call is not built either.
      expect(env.getState(formModel.$coreTx)).toBeNull();
      expect(env.getState(formModel.$canSaveAsDraft)).toBe(false);
      expect(capacity).not.toHaveBeenCalled();

      await env.executeEvent(formModel.events.toggleDraftMode, true);
      await env.executeEvent(formModel.events.draftPathCommitted, draftPath);
      expect(env.getState(formModel.$isDraftPathComplete)).toBe(true);

      await env.waitForState(formModel.$canSaveAsDraft, (canSave) => canSave);

      // The check ran on the whole file — both valid rows — while the
      // signing-side transaction still does not exist.
      expect(capacity).toHaveBeenCalledWith(expect.anything(), fakeApi, 2);
      expect(env.getState(formModel.$coreTx)).toBeNull();
      expect(env.getState(formModel.$maxRowsPerTransaction)).toBeNull();

      const weighedArgs = vi.mocked(getExtrinsic[TransactionType.BATCH_ALL]).mock.calls.at(-1)?.[0];
      expect(weighedArgs?.transactions).toHaveLength(2);
      expect(weighedArgs?.transactions[0].args.dest).toBe(toAccountId(ADDRESS_1));
      expect(weighedArgs?.transactions[1].args.dest).toBe(toAccountId(ADDRESS_2));
    });

    it('SP-58: a file too heavy for one extrinsic reports how many rows fit and withholds Save as draft', async () => {
      vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(1);
      env = await createDraftWeightEnv();

      await env.executeEvent(formModel.events.toggleDraftMode, true);
      await env.executeEvent(formModel.events.draftPathCommitted, draftPath);
      await env.executeEvent(formModel.fileUploaded, csvFile(VALID_CSV));

      // `$maxRowsPerTransaction` is what the upload step renders as the
      // too-heavy verdict (`multiTransfer.errors.csv.tooHeavyDescription`).
      await env.waitForState(formModel.$maxRowsPerTransaction, (maxRows) => maxRows === 1);

      expect(env.getState(formModel.$isDraftPathComplete)).toBe(true);
      expect(env.getState(formModel.$csvError)).toBeNull();
      expect(hasBlockingCsvState()).toBe(false);
      expect(env.getState(formModel.$canSaveAsDraft)).toBe(false);
    });
  });

  // NOTE: the whole-file initiator-balance rule (sum of all amounts must be a
  // keep-alive withdrawal from the initiator) lives in the tx validator
  // (`createTxValidationStore` + `additionalBalanceRules` in form.ts). Its
  // basic rules call `api.genesisHash` and `transactionService.getTransactionFee`
  // on a real ApiPromise, and `createStoreFromEffect` skips validation entirely
  // while `$api` is null — so it cannot be exercised in this harness without a
  // live chain API. The model-side input to that rule ($amount aggregation) is
  // covered above.
});
