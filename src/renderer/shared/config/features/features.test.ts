/**
 * Unit tests for feature flags module (shared/config/features) Tests the
 * enableFeature/disableFeature/resetFeatureConfig logic that is exposed via
 * window.__spektr_config in DEV mode.
 *
 * Issue: #19 — Debug interfaces exposure
 */
import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { $features, $mutatedFeatures, resetFeatureStatuses, updateFeatureStatus } from './index';

describe('shared/config/features — unit tests', () => {
  describe('default feature flags', () => {
    it('should have default features defined', () => {
      const scope = fork();
      const features = scope.getState($features);

      expect(features).toBeDefined();
      expect(typeof features).toBe('object');
    });

    it('should have expected core features enabled by default', () => {
      const scope = fork();
      const features = scope.getState($features);

      expect(features.dashboard).toBe(true);
      expect(features.assets).toBe(true);
      expect(features.staking).toBe(true);
      expect(features.governance).toBe(true);
      expect(features.settings).toBe(true);
    });

    it('should start with empty mutations store', () => {
      const scope = fork();
      expect(scope.getState($mutatedFeatures)).toEqual({});
    });
  });

  describe('updateFeatureStatus — enableFeature', () => {
    it('should enable a disabled feature', async () => {
      const scope = fork();
      // dappBrowser defaults to false
      expect(scope.getState($features).dappBrowser).toBe(false);

      await allSettled(updateFeatureStatus, { scope, params: ['dappBrowser', true] });

      expect(scope.getState($features).dappBrowser).toBe(true);
    });

    it('should record override in mutations store when toggling non-default value', async () => {
      const scope = fork();

      // dappBrowser defaults to false, so enabling it creates a mutation
      await allSettled(updateFeatureStatus, { scope, params: ['dappBrowser', true] });

      expect(scope.getState($mutatedFeatures)).toHaveProperty('dappBrowser', true);
    });

    it('should remove mutation when restoring to default value', async () => {
      const scope = fork();

      // dashboard defaults to true — disabling creates mutation
      await allSettled(updateFeatureStatus, { scope, params: ['dashboard', false] });
      expect(scope.getState($mutatedFeatures)).toHaveProperty('dashboard', false);

      // re-enabling (back to default) should remove the mutation
      await allSettled(updateFeatureStatus, { scope, params: ['dashboard', true] });
      expect(scope.getState($mutatedFeatures)).not.toHaveProperty('dashboard');
    });
  });

  describe('updateFeatureStatus — disableFeature', () => {
    it('should disable an enabled feature', async () => {
      const scope = fork();
      expect(scope.getState($features).dashboard).toBe(true);

      await allSettled(updateFeatureStatus, { scope, params: ['dashboard', false] });

      expect(scope.getState($features).dashboard).toBe(false);
    });

    it('should record override when disabling a default-true feature', async () => {
      const scope = fork();

      await allSettled(updateFeatureStatus, { scope, params: ['staking', false] });

      expect(scope.getState($mutatedFeatures)).toHaveProperty('staking', false);
    });

    it('should ignore updates for non-existent features', async () => {
      const scope = fork();
      const before = scope.getState($mutatedFeatures);

      await allSettled(updateFeatureStatus, { scope, params: ['nonExistentFeature', true] });

      expect(scope.getState($mutatedFeatures)).toEqual(before);
    });
  });

  describe('resetFeatureStatuses — resetFeatureConfig', () => {
    it('should clear all overrides on reset', async () => {
      const scope = fork();

      await allSettled(updateFeatureStatus, { scope, params: ['dappBrowser', true] });
      await allSettled(updateFeatureStatus, { scope, params: ['dashboard', false] });
      await allSettled(updateFeatureStatus, { scope, params: ['staking', false] });

      expect(Object.keys(scope.getState($mutatedFeatures)).length).toBeGreaterThan(0);

      await allSettled(resetFeatureStatuses, { scope });

      expect(scope.getState($mutatedFeatures)).toEqual({});
    });

    it('should restore default values after reset', async () => {
      const scope = fork();

      await allSettled(updateFeatureStatus, { scope, params: ['dashboard', false] });
      expect(scope.getState($features).dashboard).toBe(false);

      await allSettled(resetFeatureStatuses, { scope });

      expect(scope.getState($features).dashboard).toBe(true);
    });

    it('should be idempotent — reset on empty mutations is safe', async () => {
      const scope = fork();

      await allSettled(resetFeatureStatuses, { scope });

      expect(scope.getState($mutatedFeatures)).toEqual({});
    });
  });

  describe('multiple sequential updates', () => {
    it('should apply multiple feature changes independently', async () => {
      const scope = fork();

      await allSettled(updateFeatureStatus, { scope, params: ['dappBrowser', true] });
      await allSettled(updateFeatureStatus, { scope, params: ['dashboard', false] });
      await allSettled(updateFeatureStatus, { scope, params: ['staking', false] });

      const features = scope.getState($features);
      expect(features.dappBrowser).toBe(true);
      expect(features.dashboard).toBe(false);
      expect(features.staking).toBe(false);
      // Unrelated features remain at default
      expect(features.assets).toBe(true);
    });
  });
});
