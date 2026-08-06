import { describe, expect, it } from 'vitest';

import enLocale from '@/shared/i18n/locales/en.json';
import { type OperationBlockReasonKind } from '@/shared/transactions';
import { type ActionKind, ACTION_LABEL_KEYS, REASON_COPY_KEYS } from '../copyKeys';

/**
 * Locks the OperationBlocked -> i18n key mapping. `t()` is untyped against the
 * resource shape, so a typo in a key (e.g. "rateLimitedTitel") type-checks,
 * lints and renders the raw key to the user instead of copy - exactly the
 * failure this component exists to avoid surfacing in the first place. The kind
 * -> key mapping is not mechanical (`node-rate-limited` -> `rateLimited*`,
 * `network-disabled` -> `networkDisabled*`), so it can't be inferred and needs
 * an explicit check.
 */
function resolveKey(key: string): unknown {
  return key.split('.').reduce<unknown>((node, segment) => {
    if (node !== null && typeof node === 'object' && segment in node) {
      return (node as Record<string, unknown>)[segment];
    }

    return undefined;
  }, enLocale);
}

const reasonKinds = Object.keys(REASON_COPY_KEYS) as OperationBlockReasonKind[];
const actionKinds = Object.keys(ACTION_LABEL_KEYS) as ActionKind[];

describe('OperationBlocked copy keys', () => {
  it.each(reasonKinds)('reason "%s" resolves to a title and description string in en.json', (kind) => {
    const { titleKey, descriptionKey } = REASON_COPY_KEYS[kind];

    expect(typeof resolveKey(titleKey)).toBe('string');
    expect(typeof resolveKey(descriptionKey)).toBe('string');
  });

  it.each(actionKinds)('action "%s" resolves to a label string in en.json', (action) => {
    expect(typeof resolveKey(ACTION_LABEL_KEYS[action])).toBe('string');
  });
});
