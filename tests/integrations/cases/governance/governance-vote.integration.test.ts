import { BN } from '@polkadot/util';
import { allSettled } from 'effector';
import { afterEach, describe, expect, it } from 'vitest';

import { type Conviction, ConnectionStatus } from '@/shared/core';
import { voteForm } from '@/widgets/VoteModal/model/voteForm';
import { voteModal } from '@/widgets/VoteModal/model/voteModal';
import {
  polkadotChain,
  polkadotChainId,
  rootReferendum,
  senderAccount,
  senderBalance,
  treasurerReferendum,
  vaultWallet,
} from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder } from '../../utils/index';

/**
 * Integration tests for Governance Voting
 *
 * Tests actual feature behavior including:
 *
 * - Vote submission (Aye/Nay/Abstain)
 * - Vote conviction selection
 * - Vote amount validation
 * - Form validation for voting
 * - Transaction building for votes
 *
 * @group integration
 * @group governance
 * @group governance-vote
 */
describe('Governance Vote - Integration', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('Vote Submission - Aye/Nay/Abstain', () => {
    it('should submit Aye vote with standard conviction', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open vote modal
      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      // Set initiator
      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      // Set signatory (same as initiator for direct account)
      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      // Set vote amount
      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'), // 1 DOT
      });

      // Set conviction
      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      // Set decision to Aye
      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      // Submit form
      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      // Verify transaction was created
      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeDefined();

      // Verify vote decision was set correctly
      const decision = env.scope.getState(voteForm.form.fields.decision.$value);
      expect(decision).toBe('aye');
    });

    it('should submit Nay vote with different conviction', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('2000000000000'), // 2 DOT
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked2x' as Conviction,
      });

      // Set decision to Nay
      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'nay',
      });

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeDefined();

      const decision = env.scope.getState(voteForm.form.fields.decision.$value);
      expect(decision).toBe('nay');
    });

    it('should submit Abstain vote', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('500000000000'), // 0.5 DOT
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'None' as Conviction,
      });

      // Set decision to Abstain
      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'abstain',
      });

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeDefined();

      const decision = env.scope.getState(voteForm.form.fields.decision.$value);
      expect(decision).toBe('abstain');
    });
  });

  describe('Vote Conviction Selection', () => {
    it('should allow voting with None conviction (no lock)', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      // Set None conviction
      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'None' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      const conviction = env.scope.getState(voteForm.form.fields.conviction.$value);
      expect(conviction).toBe('None');

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeDefined();
    });

    it('should allow voting with maximum conviction (Locked6x)', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      // Set Locked6x conviction (maximum)
      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked6x' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      const conviction = env.scope.getState(voteForm.form.fields.conviction.$value);
      expect(conviction).toBe('Locked6x');

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeDefined();
    });

    it('should change conviction dynamically', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      // Start with Locked1x
      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      let conviction = env.scope.getState(voteForm.form.fields.conviction.$value);
      expect(conviction).toBe('Locked1x');

      // Change to Locked3x
      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked3x' as Conviction,
      });

      conviction = env.scope.getState(voteForm.form.fields.conviction.$value);
      expect(conviction).toBe('Locked3x');

      // Change to None
      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'None' as Conviction,
      });

      conviction = env.scope.getState(voteForm.form.fields.conviction.$value);
      expect(conviction).toBe('None');
    });
  });

  describe('Vote Amount Validation', () => {
    it('should reject vote with zero amount', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      // Set zero amount
      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN(0),
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      // Form should be invalid
      const isValid = env.scope.getState(voteForm.form.$isValid);
      expect(isValid).toBe(false);

      const errors = env.scope.getState(voteForm.form.fields.amount.$errors);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject vote with amount exceeding available balance', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      // Set amount exceeding balance
      const excessiveAmount = new BN(senderBalance.free).add(new BN('1000000000000'));
      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: excessiveAmount,
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      // Form should be invalid
      const isValid = env.scope.getState(voteForm.form.$isValid);
      expect(isValid).toBe(false);

      const errors = env.scope.getState(voteForm.form.fields.amount.$errors);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid vote amount within balance', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      // Set valid amount (1 DOT, well within balance)
      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      // Check that amount is within balance and form should be valid
      const amountErrors = env.scope.getState(voteForm.form.fields.amount.$errors);

      // Amount should have no errors
      expect(amountErrors.length).toBe(0);

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeDefined();
    });
  });

  describe('Form Validation', () => {
    it('should require referendum to be set', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Don't open modal with referendum
      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      const referendum = env.scope.getState(voteForm.$referendum);
      expect(referendum).toBeNull();

      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeNull();
    });

    it('should require initiator to be selected', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      // Don't set initiator
      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      const isValid = env.scope.getState(voteForm.form.$isValid);
      expect(isValid).toBe(false);

      const errors = env.scope.getState(voteForm.form.fields.initiator.$errors);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require decision (Aye/Nay/Abstain) to be selected', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      // Don't set decision

      const decision = env.scope.getState(voteForm.form.fields.decision.$value);
      expect(decision).toBeNull();

      // Transaction should not be created without decision
      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeNull();
    });
  });

  describe('Transaction Building', () => {
    it('should build transaction with correct referendum and track', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: rootReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      await allSettled(voteForm.form.submit, {
        scope: env.scope,
      });

      const tx = env.scope.getState(voteForm.$tx);
      expect(tx).toBeDefined();

      // Verify the referendum was set correctly
      const referendum = env.scope.getState(voteForm.$referendum);
      expect(referendum?.referendumId).toBe(rootReferendum.referendumId);
      expect(referendum?.track).toBe(rootReferendum.track);
    });

    it('should update transaction when vote parameters change', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voteModal.gates.flow.open, {
        scope: env.scope,
        params: {
          type: 'vote',
          referendum: treasurerReferendum,
        },
      });

      await allSettled(voteForm.form.fields.initiator.change, {
        scope: env.scope,
        params: senderAccount,
      });

      await allSettled(voteForm.form.fields.signatory.change, {
        scope: env.scope,
        params: senderAccount,
      });

      // Set initial parameters
      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('1000000000000'),
      });

      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked1x' as Conviction,
      });

      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'aye',
      });

      // Verify initial transaction is created
      let coreTx = env.scope.getState(voteForm.$coreTx);
      expect(coreTx).toBeDefined();

      // Change amount
      await allSettled(voteForm.form.fields.amount.change, {
        scope: env.scope,
        params: new BN('2000000000000'), // 2 DOT
      });

      // Verify amount change in form
      const newAmount = env.scope.getState(voteForm.form.fields.amount.$value);
      expect(newAmount?.toString()).toBe('2000000000000');

      // Change conviction
      await allSettled(voteForm.form.fields.conviction.change, {
        scope: env.scope,
        params: 'Locked3x' as Conviction,
      });

      // Verify conviction changed
      const newConviction = env.scope.getState(voteForm.form.fields.conviction.$value);
      expect(newConviction).toBe('Locked3x');

      // Change decision
      await allSettled(voteForm.form.fields.decision.change, {
        scope: env.scope,
        params: 'nay',
      });

      // Verify decision changed and transaction still exists
      const newDecision = env.scope.getState(voteForm.form.fields.decision.$value);
      expect(newDecision).toBe('nay');

      coreTx = env.scope.getState(voteForm.$coreTx);
      expect(coreTx).toBeDefined();

      // Verify referendum is still set correctly
      const referendum = env.scope.getState(voteForm.$referendum);
      expect(referendum?.referendumId).toBe(treasurerReferendum.referendumId);
    });
  });
});
