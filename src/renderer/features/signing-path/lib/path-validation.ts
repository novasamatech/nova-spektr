import { type PathNode } from '@/domains/backend';

export const MAX_PATH_DEPTH = 6;

/**
 * The shortest path that can be followed as a route: a source and the signer it
 * ends at. The empty path and a lone `signer` node are legal in the grammar (a
 * regular account signs for itself) but carry no route, so both are "no usable
 * path" rather than "path with a problem".
 */
export const MIN_PATH_LENGTH = 2;

export function isUsablePath(path: PathNode[] | undefined | null): boolean {
  return Array.isArray(path) && path.length >= MIN_PATH_LENGTH;
}

type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Settles a path by its head alone. A plain account signs for itself: a path of
 * exactly one `signer` node is complete, and a `signer` may head nothing
 * longer. A delegating head (`proxied` / `multisig`) settles nothing — the
 * caller continues with its own rules.
 */
function checkPathHead(path: PathNode[]): ValidationResult | null {
  const first = path[0]!;
  if (first.kind !== 'signer') return null;

  return path.length === 1 ? { ok: true } : { ok: false, reason: 'a signer may only stand alone' };
}

export function isValidPath(path: PathNode[]): ValidationResult {
  if (path.length === 0) return { ok: true };

  if (path.length > MAX_PATH_DEPTH) {
    return { ok: false, reason: `depth exceeds ${MAX_PATH_DEPTH}` };
  }

  const headResult = checkPathHead(path);
  if (headResult) return headResult;

  const last = path[path.length - 1]!;
  if (last.kind !== 'signer') {
    return { ok: false, reason: 'must end with a signer' };
  }

  for (let i = 1; i < path.length - 1; i++) {
    if (path[i]!.kind !== 'multisig') {
      return { ok: false, reason: 'middle nodes must be multisig' };
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

export function isValidPathPrefix(path: PathNode[]): ValidationResult {
  if (path.length === 0) return { ok: true };

  if (path.length > MAX_PATH_DEPTH) {
    return { ok: false, reason: `depth exceeds ${MAX_PATH_DEPTH}` };
  }

  const headResult = checkPathHead(path);
  if (headResult) return headResult;

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
