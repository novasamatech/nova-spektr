import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';

import {
  MAX_PATH_DEPTH,
  deriveInitiatorAccountId,
  deriveMultisigAccountId,
  isCycleFreeAppend,
  isValidPath,
  isValidPathPrefix,
} from './path-validation';

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

describe('path-validation', () => {
  describe('isValidPath', () => {
    it('empty path is valid', () => {
      expect(isValidPath([])).toEqual({ ok: true });
    });

    it('rejects path not ending in signer', () => {
      const path: PathNode[] = [{ kind: 'multisig', accountId: acc(1) }];
      expect(isValidPath(path).ok).toBe(false);
    });

    it('accepts a lone signer — a plain account signing for itself', () => {
      const path: PathNode[] = [{ kind: 'signer', accountId: acc(1) }];
      expect(isValidPath(path)).toEqual({ ok: true });
    });

    it('rejects a signer as the first of several nodes', () => {
      const path: PathNode[] = [
        { kind: 'signer', accountId: acc(1) },
        { kind: 'signer', accountId: acc(2) },
      ];
      expect(isValidPath(path).ok).toBe(false);
    });

    it('accepts proxied -> signer (direct delegate)', () => {
      const path: PathNode[] = [
        { kind: 'proxied', accountId: acc(1) },
        { kind: 'signer', accountId: acc(2) },
      ];
      expect(isValidPath(path).ok).toBe(true);
    });

    it('rejects middle node that is not multisig', () => {
      const path: PathNode[] = [
        { kind: 'multisig', accountId: acc(1) },
        { kind: 'signer', accountId: acc(2) },
        { kind: 'signer', accountId: acc(3) },
      ];
      expect(isValidPath(path).ok).toBe(false);
    });

    it('rejects duplicates', () => {
      const path: PathNode[] = [
        { kind: 'multisig', accountId: acc(1) },
        { kind: 'multisig', accountId: acc(1) },
        { kind: 'signer', accountId: acc(2) },
      ];
      expect(isValidPath(path).ok).toBe(false);
    });

    it('rejects depth > MAX_PATH_DEPTH', () => {
      const path: PathNode[] = Array.from({ length: MAX_PATH_DEPTH + 1 }, (_, i) =>
        i < MAX_PATH_DEPTH
          ? ({ kind: 'multisig', accountId: acc(i + 1) } satisfies PathNode)
          : ({ kind: 'signer', accountId: acc(i + 1) } satisfies PathNode),
      );
      expect(isValidPath(path).ok).toBe(false);
    });

    it('accepts proxied -> multisig -> signer', () => {
      const path: PathNode[] = [
        { kind: 'proxied', accountId: acc(1) },
        { kind: 'multisig', accountId: acc(2) },
        { kind: 'signer', accountId: acc(3) },
      ];
      expect(isValidPath(path).ok).toBe(true);
    });

    it('accepts multisig -> nested-multisig -> signer', () => {
      const path: PathNode[] = [
        { kind: 'multisig', accountId: acc(1) },
        { kind: 'multisig', accountId: acc(2) },
        { kind: 'signer', accountId: acc(3) },
      ];
      expect(isValidPath(path).ok).toBe(true);
    });
  });

  describe('isValidPathPrefix', () => {
    it('empty path is valid', () => {
      expect(isValidPathPrefix([]).ok).toBe(true);
    });

    it('accepts a single proxied node', () => {
      expect(isValidPathPrefix([{ kind: 'proxied', accountId: acc(1) }]).ok).toBe(true);
    });

    it('accepts a single multisig node', () => {
      expect(isValidPathPrefix([{ kind: 'multisig', accountId: acc(1) }]).ok).toBe(true);
    });

    it('accepts a lone signer as a complete prefix', () => {
      expect(isValidPathPrefix([{ kind: 'signer', accountId: acc(1) }])).toEqual({ ok: true });
    });

    it('rejects a signer followed by anything', () => {
      const path: PathNode[] = [
        { kind: 'signer', accountId: acc(1) },
        { kind: 'multisig', accountId: acc(2) },
      ];
      expect(isValidPathPrefix(path).ok).toBe(false);
    });

    it('accepts proxied → multisig (incomplete prefix)', () => {
      const path: PathNode[] = [
        { kind: 'proxied', accountId: acc(1) },
        { kind: 'multisig', accountId: acc(2) },
      ];
      expect(isValidPathPrefix(path).ok).toBe(true);
    });

    it('accepts a complete path', () => {
      const path: PathNode[] = [
        { kind: 'proxied', accountId: acc(1) },
        { kind: 'multisig', accountId: acc(2) },
        { kind: 'signer', accountId: acc(3) },
      ];
      expect(isValidPathPrefix(path).ok).toBe(true);
    });

    it('accepts proxied → signer (direct delegate)', () => {
      const path: PathNode[] = [
        { kind: 'proxied', accountId: acc(1) },
        { kind: 'signer', accountId: acc(2) },
      ];
      expect(isValidPathPrefix(path).ok).toBe(true);
    });

    it('rejects cycles', () => {
      const path: PathNode[] = [
        { kind: 'proxied', accountId: acc(1) },
        { kind: 'multisig', accountId: acc(1) },
      ];
      expect(isValidPathPrefix(path).ok).toBe(false);
    });
  });

  describe('isCycleFreeAppend', () => {
    it('allows new accountId', () => {
      const path: PathNode[] = [{ kind: 'multisig', accountId: acc(1) }];
      expect(isCycleFreeAppend(path, { kind: 'signer', accountId: acc(2) })).toBe(true);
    });

    it('rejects duplicate accountId', () => {
      const path: PathNode[] = [{ kind: 'multisig', accountId: acc(1) }];
      expect(isCycleFreeAppend(path, { kind: 'multisig', accountId: acc(1) })).toBe(false);
    });
  });

  describe('deriveMultisigAccountId', () => {
    it('returns null for empty path', () => {
      expect(deriveMultisigAccountId([])).toBeNull();
    });

    it('returns the last multisig hop', () => {
      const path: PathNode[] = [
        { kind: 'proxied', accountId: acc(1) },
        { kind: 'multisig', accountId: acc(2) },
        { kind: 'multisig', accountId: acc(3) },
        { kind: 'signer', accountId: acc(4) },
      ];
      expect(deriveMultisigAccountId(path)).toBe(acc(3));
    });
  });

  describe('deriveInitiatorAccountId', () => {
    it('returns null for empty path', () => {
      expect(deriveInitiatorAccountId([])).toBeNull();
    });

    it('returns the signer accountId', () => {
      const path: PathNode[] = [
        { kind: 'multisig', accountId: acc(1) },
        { kind: 'signer', accountId: acc(2) },
      ];
      expect(deriveInitiatorAccountId(path)).toBe(acc(2));
    });
  });
});
