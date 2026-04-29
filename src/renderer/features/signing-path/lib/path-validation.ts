import { type PathNode } from '@/domains/backend';

export const MAX_PATH_DEPTH = 6;

type ValidationResult = { ok: true } | { ok: false; reason: string };

export function isValidPath(path: PathNode[]): ValidationResult {
  if (path.length === 0) return { ok: true };

  if (path.length > MAX_PATH_DEPTH) {
    return { ok: false, reason: `depth exceeds ${MAX_PATH_DEPTH}` };
  }

  const first = path[0]!;
  if (first.kind !== 'proxied' && first.kind !== 'multisig') {
    return { ok: false, reason: 'must start with proxied or multisig' };
  }

  const last = path[path.length - 1]!;
  if (last.kind !== 'signer') {
    return { ok: false, reason: 'must end with a signer' };
  }

  for (let i = 1; i < path.length - 1; i++) {
    if (path[i]!.kind !== 'multisig') {
      return { ok: false, reason: 'middle nodes must be multisig' };
    }
  }

  if (!path.some((n) => n.kind === 'multisig')) {
    return { ok: false, reason: 'must contain at least one multisig node' };
  }

  const seen = new Set<string>();
  for (const node of path) {
    if (seen.has(node.accountId)) {
      return { ok: false, reason: 'cycle (duplicate accountId)' };
    }
    seen.add(node.accountId);
  }

  return { ok: true };
}

export function isValidPathPrefix(path: PathNode[]): ValidationResult {
  if (path.length === 0) return { ok: true };

  if (path.length > MAX_PATH_DEPTH) {
    return { ok: false, reason: `depth exceeds ${MAX_PATH_DEPTH}` };
  }

  const first = path[0]!;
  if (first.kind !== 'proxied' && first.kind !== 'multisig') {
    return { ok: false, reason: 'must start with proxied or multisig' };
  }

  for (let i = 1; i < path.length - 1; i++) {
    if (path[i]!.kind !== 'multisig') {
      return { ok: false, reason: 'intermediate nodes must be multisig' };
    }
  }

  if (path.length >= 2) {
    const last = path[path.length - 1]!;
    if (last.kind !== 'multisig' && last.kind !== 'signer') {
      return { ok: false, reason: 'last node must be multisig or signer' };
    }
    if (last.kind === 'signer' && !path.some((n) => n.kind === 'multisig')) {
      return { ok: false, reason: 'must contain at least one multisig node' };
    }
  }

  const seen = new Set<string>();
  for (const node of path) {
    if (seen.has(node.accountId)) {
      return { ok: false, reason: 'cycle (duplicate accountId)' };
    }
    seen.add(node.accountId);
  }

  return { ok: true };
}

export function isCycleFreeAppend(path: PathNode[], next: PathNode): boolean {
  return !path.some((n) => n.accountId === next.accountId);
}

export function deriveMultisigAccountId(path: PathNode[]): string | null {
  return path.findLast((n) => n.kind === 'multisig')?.accountId ?? null;
}

export function deriveInitiatorAccountId(path: PathNode[]): string | null {
  const last = path.at(-1);
  return last?.kind === 'signer' ? last.accountId : null;
}
