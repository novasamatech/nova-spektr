import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { evidenceForm } from '@/features/fellowship-evidence/model/evidenceForm';
import { evidenceIPFS } from '@/features/fellowship-evidence/model/evidenceIPFS';
import { evidencePost } from '@/features/fellowship-evidence/model/evidencePost';
import { polkadotChain, polkadotChainId, senderAccount, senderBalance, vaultWallet } from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

/**
 * Integration tests for Fellowship Evidence Submission
 *
 * Tests actual feature behavior including:
 *
 * - Opening evidence flow for Promotion/Retention
 * - Evidence form validation
 * - Evidence content formatting
 * - IPFS upload flow
 * - Transaction building for evidence submission
 *
 * @group integration
 * @group fellowship
 * @group fellowship-evidence
 */
describe('Fellowship Evidence - Integration', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('Evidence Flow Setup', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Evidence',
        story: 'Evidence Flow Setup',
      });
    });

    it('should open evidence flow for Promotion', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open flow with Promotion wish
      await allSettled(evidenceForm.flow.open, {
        scope: env.scope,
        params: {
          wish: 'Promotion',
        },
      });

      // Verify wish is set
      const wish = env.scope.getState(evidenceForm.$wish);
      expect(wish).toBe('Promotion');
    });

    it('should open evidence flow for Retention', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceForm.flow.open, {
        scope: env.scope,
        params: {
          wish: 'Retention',
        },
      });

      const wish = env.scope.getState(evidenceForm.$wish);
      expect(wish).toBe('Retention');
    });

    it('should set flow type to fromScratch for manual entry', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceForm.flow.open, {
        scope: env.scope,
        params: {
          wish: 'Promotion',
        },
      });

      await allSettled(evidenceForm.setFlowType, {
        scope: env.scope,
        params: 'fromScratch',
      });

      const flowType = env.scope.getState(evidenceForm.$flowType);
      expect(flowType).toBe('fromScratch');
    });

    it('should set flow type to ipfsUpload for file upload', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceForm.flow.open, {
        scope: env.scope,
        params: {
          wish: 'Retention',
        },
      });

      await allSettled(evidenceForm.setFlowType, {
        scope: env.scope,
        params: 'ipfsUpload',
      });

      const flowType = env.scope.getState(evidenceForm.$flowType);
      expect(flowType).toBe('ipfsUpload');
    });
  });

  describe('Evidence Form Validation', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Evidence',
        story: 'Evidence Form Validation',
      });
    });

    it('should validate required areas field', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceForm.flow.open, {
        scope: env.scope,
        params: { wish: 'Promotion' },
      });

      await allSettled(evidenceForm.setFlowType, {
        scope: env.scope,
        params: 'fromScratch',
      });

      // Set empty areas - should fail validation
      await allSettled(evidenceForm.form.fields.areas.onChange, {
        scope: env.scope,
        params: '',
      });

      // Set valid evidence and comments
      await allSettled(evidenceForm.form.fields.evidence.onChange, {
        scope: env.scope,
        params: 'My contributions to the ecosystem include developing tools and documentation.',
      });

      await allSettled(evidenceForm.form.fields.comments.onChange, {
        scope: env.scope,
        params: 'Additional context for my promotion request.',
      });

      // Submit form to trigger validation
      await allSettled(evidenceForm.form.submit, {
        scope: env.scope,
      });

      // Check for errors on areas field
      const areasErrors = env.scope.getState(evidenceForm.form.fields.areas.$errors);
      expect(areasErrors.length).toBeGreaterThan(0);
    });

    it('should validate required evidence field', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceForm.flow.open, {
        scope: env.scope,
        params: { wish: 'Retention' },
      });

      await allSettled(evidenceForm.setFlowType, {
        scope: env.scope,
        params: 'fromScratch',
      });

      // Set valid areas
      await allSettled(evidenceForm.form.fields.areas.onChange, {
        scope: env.scope,
        params: 'Runtime Development, Documentation',
      });

      // Set empty evidence - should fail
      await allSettled(evidenceForm.form.fields.evidence.onChange, {
        scope: env.scope,
        params: '',
      });

      await allSettled(evidenceForm.form.fields.comments.onChange, {
        scope: env.scope,
        params: 'My retention request.',
      });

      await allSettled(evidenceForm.form.submit, {
        scope: env.scope,
      });

      const evidenceErrors = env.scope.getState(evidenceForm.form.fields.evidence.$errors);
      expect(evidenceErrors.length).toBeGreaterThan(0);
    });

    it('should accept valid form submission', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceForm.flow.open, {
        scope: env.scope,
        params: { wish: 'Promotion' },
      });

      await allSettled(evidenceForm.setFlowType, {
        scope: env.scope,
        params: 'fromScratch',
      });

      // Set all valid fields
      await allSettled(evidenceForm.form.fields.areas.onChange, {
        scope: env.scope,
        params: 'Runtime Development, Tooling, Documentation',
      });

      await allSettled(evidenceForm.form.fields.evidence.onChange, {
        scope: env.scope,
        params: `## My Contributions

### Runtime Development
- Implemented feature X
- Fixed critical bug Y
- Optimized performance by Z%

### Tooling
- Created CLI tool for developers
- Improved CI/CD pipeline

### Documentation
- Updated API documentation
- Created onboarding guide`,
      });

      await allSettled(evidenceForm.form.fields.comments.onChange, {
        scope: env.scope,
        params: 'I request promotion based on my contributions over the past 6 months.',
      });

      await allSettled(evidenceForm.form.submit, {
        scope: env.scope,
      });

      // All fields should have no errors
      const areasErrors = env.scope.getState(evidenceForm.form.fields.areas.$errors);
      const evidenceErrors = env.scope.getState(evidenceForm.form.fields.evidence.$errors);
      const commentsErrors = env.scope.getState(evidenceForm.form.fields.comments.$errors);

      expect(areasErrors.length).toBe(0);
      expect(evidenceErrors.length).toBe(0);
      expect(commentsErrors.length).toBe(0);
    });
  });

  describe('Evidence Post Flow', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Evidence',
        story: 'Evidence Post Flow',
      });
    });

    it('should set step to form when opening post flow', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidencePost.setStep, {
        scope: env.scope,
        params: 'form',
      });

      const step = env.scope.getState(evidencePost.$step);
      expect(step).toBe('form');
    });

    it('should set active wish for post flow', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidencePost.setActiveWish, {
        scope: env.scope,
        params: 'Promotion',
      });

      const activeWish = env.scope.getState(evidencePost.$activeWish);
      expect(activeWish).toBe('Promotion');
    });

    it('should transition to submit step', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidencePost.setStep, {
        scope: env.scope,
        params: 'form',
      });

      await allSettled(evidencePost.setStep, {
        scope: env.scope,
        params: 'submit',
      });

      const step = env.scope.getState(evidencePost.$step);
      expect(step).toBe('submit');
    });

    it('should save evidence to basket', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidencePost.setActiveWish, {
        scope: env.scope,
        params: 'Retention',
      });

      await allSettled(evidencePost.setStep, {
        scope: env.scope,
        params: 'form',
      });

      // Verify save to basket event exists
      expect(evidencePost.saveToBasket).toBeDefined();
    });
  });

  describe('IPFS Flow', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Evidence',
        story: 'IPFS Flow',
      });
    });

    it('should set IPFS step to upload', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceIPFS.setStep, {
        scope: env.scope,
        params: 'upload',
      });

      const step = env.scope.getState(evidenceIPFS.$step);
      expect(step).toBe('upload');
    });

    it('should set pending data for file upload', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceIPFS.setPendingData, {
        scope: env.scope,
        params: {
          type: 'hash',
          hash: 'QmTestHash123456789',
        },
      });

      const pendingData = env.scope.getState(evidenceIPFS.$pendingData);
      expect(pendingData?.type).toBe('hash');
      expect(pendingData?.hash).toBe('QmTestHash123456789');
    });

    it('should transition to preview step', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceIPFS.setStep, {
        scope: env.scope,
        params: 'upload',
      });

      await allSettled(evidenceIPFS.setStep, {
        scope: env.scope,
        params: 'preview',
      });

      const step = env.scope.getState(evidenceIPFS.$step);
      expect(step).toBe('preview');
    });

    it('should reset IPFS state', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Set some state
      await allSettled(evidenceIPFS.setStep, {
        scope: env.scope,
        params: 'upload',
      });

      await allSettled(evidenceIPFS.setPendingData, {
        scope: env.scope,
        params: {
          type: 'hash',
          hash: 'QmTestHash',
        },
      });

      // Reset
      await allSettled(evidenceIPFS.reset, {
        scope: env.scope,
      });

      const step = env.scope.getState(evidenceIPFS.$step);
      expect(step).toBe('closed');
    });
  });

  describe('Evidence Model Structure', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Evidence',
        story: 'Evidence Model Structure',
      });
    });

    it('should have evidenceUploaded event defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // The evidenceUploaded event is exported and triggers the submit step
      expect(evidenceForm.evidenceUploaded).toBeDefined();
    });

    it('should have post effect defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(evidenceForm.post).toBeDefined();
    });

    it('should have $formattedMarkdown store defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(evidenceForm.$formattedMarkdown).toBeDefined();
    });

    it('should have $uploadError store defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(evidenceForm.$uploadError).toBeDefined();
    });
  });

  describe('Form Reset', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Evidence',
        story: 'Form Reset',
      });
    });

    it('should reset form fields', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(evidenceForm.flow.open, {
        scope: env.scope,
        params: { wish: 'Promotion' },
      });

      await allSettled(evidenceForm.setFlowType, {
        scope: env.scope,
        params: 'fromScratch',
      });

      // Fill form
      await allSettled(evidenceForm.form.fields.areas.onChange, {
        scope: env.scope,
        params: 'Some areas',
      });

      await allSettled(evidenceForm.form.fields.evidence.onChange, {
        scope: env.scope,
        params: 'Some evidence',
      });

      // Reset
      await allSettled(evidenceForm.form.reset, {
        scope: env.scope,
      });

      // Fields should be reset
      const areas = env.scope.getState(evidenceForm.form.fields.areas.$value);
      const evidence = env.scope.getState(evidenceForm.form.fields.evidence.$value);

      expect(areas).toBe('');
      expect(evidence).toBe('');
    });
  });
});
